import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Copy, Users,
  Monitor, MonitorOff, Download,
} from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: Date;
}

interface Participant {
  userId: string;
  name: string;
  joinedAt: Date;
  leftAt: Date | null;
}

const MeetingRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const setupPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate, sender: user!.id },
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setConnected(false);
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [user]);

  // Fetch participants from DB
  const fetchParticipants = useCallback(async (mId: string) => {
    const { data } = await supabase
      .from("meeting_attendees")
      .select("user_id, joined_at, left_at")
      .eq("meeting_id", mId);

    if (data) {
      const withProfiles = await Promise.all(
        data.map(async (a) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", a.user_id)
            .single();
          return {
            userId: a.user_id,
            name: profile?.display_name || "Unknown",
            joinedAt: new Date(a.joined_at),
            leftAt: a.left_at ? new Date(a.left_at) : null,
          };
        })
      );
      setParticipants(withProfiles);
    }
  }, []);

  useEffect(() => {
    if (!user || !roomId) return;

    const init = async () => {
      // Record meeting in DB
      const { data: meeting } = await supabase
        .from("meetings")
        .select("id")
        .eq("room_id", roomId)
        .single();

      if (meeting) {
        setMeetingId(meeting.id);
        // Record attendance
        await supabase.from("meeting_attendees").upsert(
          { meeting_id: meeting.id, user_id: user.id },
          { onConflict: "meeting_id,user_id" }
        );
        // Update meeting status
        await supabase
          .from("meetings")
          .update({ status: "active", started_at: new Date().toISOString() })
          .eq("id", meeting.id)
          .eq("created_by", user.id);

        fetchParticipants(meeting.id);
      }

      // Get media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = setupPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Set up signaling channel
        const channel = supabase.channel(`meeting:${roomId}`, {
          config: { presence: { key: user.id } },
        });

        channelRef.current = channel;

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (payload.sender === user.id) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "answer",
              payload: { answer, sender: user.id },
            });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.sender === user.id) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.sender === user.id) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error("Error adding ICE candidate:", e);
            }
          })
          .on("broadcast", { event: "chat" }, ({ payload }) => {
            setMessages((prev) => [...prev, { sender: payload.sender, text: payload.text, timestamp: new Date() }]);
          })
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            setParticipantCount(Object.keys(state).length);
          })
          .on("presence", { event: "join" }, async ({ key }) => {
            if (key !== user.id) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { offer, sender: user.id },
              });
            }
            // Refresh participants list
            if (meeting) fetchParticipants(meeting.id);
          })
          .on("presence", { event: "leave" }, () => {
            if (meeting) fetchParticipants(meeting.id);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel.track({ user_id: user.id });
            }
          });
      } catch (err) {
        toast({ variant: "destructive", title: "Camera/Mic Error", description: "Please allow camera and microphone access." });
      }
    };

    init();

    return () => {
      localStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current?.getTracks().forEach((t) => t.stop());
      peerConnection.current?.close();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, roomId, setupPeerConnection, toast, fetchParticipants]);

  const toggleVideo = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen sharing
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      setScreenSharing(false);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }

      // Replace screen track with camera track in peer connection
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack && peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(
          (s) => s.track?.kind === "video"
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Notify peers
      channelRef.current?.send({
        type: "broadcast",
        event: "screen-share",
        payload: { sender: user!.id, sharing: false },
      });

      toast({ title: "Screen sharing stopped" });
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        screenStream.current = stream;
        setScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }

        // Replace camera track with screen track in peer connection
        const screenTrack = stream.getVideoTracks()[0];
        if (peerConnection.current) {
          const sender = peerConnection.current.getSenders().find(
            (s) => s.track?.kind === "video"
          );
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Listen for when user stops sharing via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        // Notify peers
        channelRef.current?.send({
          type: "broadcast",
          event: "screen-share",
          payload: { sender: user!.id, sharing: true },
        });

        toast({ title: "Screen sharing started" });
      } catch (err) {
        toast({ variant: "destructive", title: "Screen share failed", description: "Could not access your screen." });
      }
    }
  };

  const leaveMeeting = async () => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    peerConnection.current?.close();

    if (meetingId && user) {
      await supabase
        .from("meeting_attendees")
        .update({ left_at: new Date().toISOString() })
        .eq("meeting_id", meetingId)
        .eq("user_id", user.id);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    navigate("/dashboard");
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !channelRef.current) return;
    const msg = { sender: user?.email?.split("@")[0] || "You", text: messageInput };
    channelRef.current.send({ type: "broadcast", event: "chat", payload: msg });
    setMessages((prev) => [...prev, { ...msg, timestamp: new Date() }]);
    setMessageInput("");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || "");
    toast({ title: "Room code copied!" });
  };

  const exportParticipants = () => {
    if (participants.length === 0) {
      toast({ variant: "destructive", title: "No participants to export" });
      return;
    }

    const csvHeader = "Name,Joined At,Left At,Duration (minutes)\n";
    const csvRows = participants.map((p) => {
      const leftAt = p.leftAt || new Date();
      const durationMs = leftAt.getTime() - p.joinedAt.getTime();
      const durationMin = Math.round(durationMs / 60000);
      return `"${p.name}","${format(p.joinedAt, "yyyy-MM-dd HH:mm:ss")}","${p.leftAt ? format(p.leftAt, "yyyy-MM-dd HH:mm:ss") : "Still in meeting"}","${durationMin}"`;
    });

    const csv = csvHeader + csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${roomId}-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Participants list downloaded!" });
  };

  const sidebarOpen = chatOpen || participantsOpen;

  return (
    <div className="h-screen bg-foreground flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-foreground/90">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <span className="text-primary-foreground font-heading font-semibold">Echoo Meeting</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyRoomId} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-foreground transition-colors">
            <Copy className="w-3 h-3" /> {roomId}
          </button>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {participantCount}
          </span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex relative">
        <div className={`flex-1 flex items-center justify-center ${sidebarOpen ? "mr-80" : ""} transition-all`}>
          {/* Screen share video (main view when sharing) */}
          {screenSharing && (
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          )}

          {/* Remote video */}
          {!screenSharing && (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${!connected ? "hidden" : ""}`}
              />
              {!connected && (
                <div className="text-muted-foreground text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Waiting for others to join...</p>
                  <p className="text-sm mt-2">Share the room code: <strong className="text-primary">{roomId}</strong></p>
                </div>
              )}
            </>
          )}

          {/* Local video (PiP) */}
          <div className="absolute bottom-24 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-primary/30">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-foreground flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="absolute right-0 top-0 bottom-16 w-80 bg-card flex flex-col border-l border-border">
            <div className="p-3 border-b border-border font-heading font-semibold text-foreground">Chat</div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold text-primary">{m.sender}: </span>
                  <span className="text-foreground">{m.text}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button size="sm" onClick={sendMessage}>Send</Button>
            </div>
          </div>
        )}

        {/* Participants sidebar */}
        {participantsOpen && (
          <div className="absolute right-0 top-0 bottom-16 w-80 bg-card flex flex-col border-l border-border">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-heading font-semibold text-foreground">
                Participants ({participants.length})
              </span>
              <Button size="sm" variant="outline" onClick={exportParticipants} className="gap-1">
                <Download className="w-3 h-3" /> Export CSV
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No participants yet</p>
              ) : (
                participants.map((p) => (
                  <div key={p.userId} className="p-3 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.leftAt ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                        {p.leftAt ? "Left" : "In meeting"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined: {format(p.joinedAt, "h:mm a")}
                      {p.leftAt && ` · Left: ${format(p.leftAt, "h:mm a")}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 py-4 bg-foreground/95">
        <Button
          variant={audioEnabled ? "secondary" : "destructive"}
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={toggleAudio}
          title={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button
          variant={videoEnabled ? "secondary" : "destructive"}
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={toggleVideo}
          title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          variant={screenSharing ? "destructive" : "secondary"}
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={toggleScreenShare}
          title={screenSharing ? "Stop sharing" : "Share screen"}
        >
          {screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={() => { setChatOpen(!chatOpen); if (participantsOpen) setParticipantsOpen(false); }}
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={() => { setParticipantsOpen(!participantsOpen); if (chatOpen) setChatOpen(false); }}
          title="Participants"
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={leaveMeeting}
          title="Leave meeting"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default MeetingRoom;

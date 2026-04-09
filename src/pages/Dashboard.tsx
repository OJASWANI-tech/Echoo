import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Video, Plus, LogOut, User, Clock, Users } from "lucide-react";
import { format } from "date-fns";

interface Meeting {
  id: string;
  room_id: string;
  title: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

interface MeetingWithAttendees extends Meeting {
  attendee_count: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAttendees[]>([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMeetings();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user!.id)
      .single();
    setProfile(data);
  };

  const fetchMeetings = async () => {
    const { data: meetingsData } = await supabase
      .from("meetings")
      .select("*")
      .eq("created_by", user!.id)
      .order("created_at", { ascending: false });

    if (meetingsData) {
      const withAttendees = await Promise.all(
        meetingsData.map(async (m) => {
          const { count } = await supabase
            .from("meeting_attendees")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", m.id);
          return { ...m, attendee_count: count || 0 };
        })
      );
      setMeetings(withAttendees);
    }
  };

  const createMeeting = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .insert({ created_by: user!.id, title: newTitle || "Untitled Meeting" })
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    setNewTitle("");
    navigate(`/meeting/${data.room_id}`);
  };

  const joinMeeting = () => {
    if (joinRoomId.trim()) {
      navigate(`/meeting/${joinRoomId.trim()}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Video className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-heading font-bold text-primary">Echoo</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <User className="w-4 h-4 mr-1" /> Profile
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Welcome */}
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Hello, {profile?.display_name || user?.email?.split("@")[0]} 👋
        </h1>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <Plus className="w-5 h-5 text-primary" /> Start a Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Meeting title (optional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Button className="w-full" onClick={createMeeting}>
                Create & Join Meeting
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <Video className="w-5 h-5 text-primary" /> Join a Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Enter meeting code"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
              />
              <Button variant="outline" className="w-full" onClick={joinMeeting}>
                Join Meeting
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Meeting History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Clock className="w-5 h-5 text-primary" /> Meeting History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No meetings yet. Start your first meeting!</p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div>
                      <h3 className="font-semibold text-foreground">{m.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(m.created_at), "MMM d, yyyy h:mm a")} · Code: {m.room_id}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {m.attendee_count} attendees · Status: {m.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {m.status !== "ended" && (
                        <Button size="sm" onClick={() => navigate(`/meeting/${m.room_id}`)}>
                          Rejoin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

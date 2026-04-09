import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Video, ArrowLeft, Upload } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user!.id)
      .single();
    if (data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `${user!.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
    if (uploadError) {
      toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("user_id", user!.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Profile updated!" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Video className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-heading font-bold text-primary">Echoo</span>
        </div>
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </nav>

      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {displayName?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Change Avatar"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;

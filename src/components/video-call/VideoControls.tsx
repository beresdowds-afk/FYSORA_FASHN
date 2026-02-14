import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface VideoControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onInviteHuman?: () => void;
  isAiMode: boolean;
}

const VideoControls = ({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onInviteHuman,
  isAiMode,
}: VideoControlsProps) => {
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4 bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={isMuted ? "destructive" : "outline"}
            className="h-12 w-12 rounded-full"
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={isCameraOff ? "destructive" : "outline"}
            className="h-12 w-12 rounded-full"
            onClick={onToggleCamera}
          >
            {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isCameraOff ? "Turn camera on" : "Turn camera off"}</TooltipContent>
      </Tooltip>

      {isAiMode && onInviteHuman && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full"
              onClick={onInviteHuman}
            >
              <Users size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Invite staff to join</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={onEndCall}
          >
            <PhoneOff size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>End call</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default VideoControls;

interface VideoSubtitlesProps {
  text: string | null;
  participantName?: string;
}

export default function VideoSubtitles({ text, participantName }: VideoSubtitlesProps) {
  if (!text) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div className="bg-black/60 text-white p-2 rounded text-center">
        <span className="text-blue-400 font-medium">{participantName && `${participantName}: `}</span>
        {text}
      </div>
    </div>
  );
}

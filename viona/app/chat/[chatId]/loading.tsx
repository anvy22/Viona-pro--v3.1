import { LoadingSpinner } from "@/app/warehouse/components/LoadingSpinner";

export default function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner message="Loading chat..." showCard={false} />
    </div>
  );
}

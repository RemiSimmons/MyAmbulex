import { useAuth } from "@/hooks/use-auth";

export default function SimpleHomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">MyAmbulex</h1>
      <p className="mt-4">Welcome to the medical transportation platform</p>
      {user ? (
        <p className="mt-2">Hello, {user.username}!</p>
      ) : (
        <p className="mt-2">Please sign in to continue.</p>
      )}
    </div>
  );
}
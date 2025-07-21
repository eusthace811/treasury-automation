import { getChatById } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    // Ensure user can only access their own chats
    if (chat.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    return Response.json(chat);
  } catch (error) {
    console.error('Error fetching chat data:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

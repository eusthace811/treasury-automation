import { getChatById } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth').toResponse();
  }

  const { id } = await params;

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      // return new ChatSDKError('not_found:chat').toResponse();
      return Response.json({}, { status: 200 });
    }

    // Ensure user can only access their own chats
    if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    return Response.json(chat);
  } catch (error) {
    console.error('Error fetching chat data:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

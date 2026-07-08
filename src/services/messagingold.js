import { databases, storage, client, DB, C, B, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'

export async function getOrCreateConversation (userId1, userId2) {
  // Fetch all conversations of userId1 and find one that contains userId2
  const r = await databases.listDocuments(DB, C.CONVERSATIONS, [
    Query.contains('participant_ids', [userId1]),
    Query.limit(200),
  ])
  const existing = r.documents.find(c => c.participant_ids.includes(userId2))
  if (existing) return existing

  return databases.createDocument(DB, C.CONVERSATIONS, uid(), {
    participant_ids:  [userId1, userId2],
    last_message_id:  null,
    last_message_at:  now(),
    created_at:       now(),
    updated_at:       now(),
  })
}

export async function getUserConversations (userId, limit = 30) {
  const r = await databases.listDocuments(DB, C.CONVERSATIONS, [
    Query.contains('participant_ids', [userId]),
    Query.orderDesc('updated_at'),
    Query.limit(limit),
  ])
  return r.documents
}

export async function sendMessage (conversationId, senderId, content, mediaUrl = null, mediaType = null) {
  const msg = await databases.createDocument(DB, C.MESSAGES, uid(), {
    conversation_id: conversationId,
    sender_id:       senderId,
    content,
    media_url:       mediaUrl,
    media_type:      mediaType,
    is_read:         false,
    read_at:         null,
    created_at:      now(),
  })
  // Update conversation meta
  await databases.updateDocument(DB, C.CONVERSATIONS, conversationId, {
    last_message_id: msg.$id,
    last_message_at: now(),
    updated_at:      now(),
  })
  return msg
}

export async function getMessages (conversationId, limit = 50, offset = 0) {
  const r = await databases.listDocuments(DB, C.MESSAGES, [
    Query.equal('conversation_id', conversationId),
    Query.orderAsc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return r.documents
}

export async function markConversationRead (conversationId, readerId) {
  const r = await databases.listDocuments(DB, C.MESSAGES, [
    Query.equal('conversation_id', conversationId),
    Query.equal('is_read', false),
    Query.notEqual('sender_id', readerId),
    Query.limit(100),
  ])
  await Promise.all(r.documents.map(m =>
    databases.updateDocument(DB, C.MESSAGES, m.$id, { is_read: true, read_at: now() })
  ))
}

export async function deleteMessage (messageId) {
  await databases.deleteDocument(DB, C.MESSAGES, messageId)
}

export async function uploadMessageMedia (file) {
  const f = await storage.createFile(B.MESSAGES, uid(), file)
  return storage.getFileView(B.MESSAGES, f.$id)
}

export async function getUnreadMessageCount (userId) {
  const convs = await getUserConversations(userId)
  let count = 0
  await Promise.all(convs.map(async c => {
    const r = await databases.listDocuments(DB, C.MESSAGES, [
      Query.equal('conversation_id', c.$id),
      Query.equal('is_read', false),
      Query.notEqual('sender_id', userId),
      Query.limit(1),
    ])
    count += r.total
  }))
  return count
}

// ── Real-time ─────────────────────────────────────────────────────────────────
export function subscribeMessages(conversationId, cb) {
  return client.subscribe(
    `databases.${DB}.collections.${C.MESSAGES}.documents`,
    (event) => {
      if (event.payload?.conversation_id === conversationId) {
        cb(event)
      }
    }
  )
}
export function subscribeConversations(userId, cb) {
  return client.subscribe(
    `databases.${DB}.collections.${C.CONVERSATIONS}.documents`,
    (event) => {
      if (event.payload?.participant_ids?.includes(userId)) {
        cb(event)
      }
    }
  )
}

export async function getConversation (conversationId) {
  return databases.getDocument(DB, C.CONVERSATIONS, conversationId)
}

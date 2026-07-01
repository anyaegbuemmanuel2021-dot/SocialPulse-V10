import { account, databases, DB, C, uid, now } from '@/config/appwrite'

let _user    = null
let _profile = null

function makeUsername (name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30)
    + '_' + Math.random().toString(36).slice(2, 7)
}

export async function initializeAuth () {
  try {
    _user    = await account.get()
    _profile = await databases.getDocument(DB, C.USERS, _user.$id)
    localStorage.setItem('sp_token', 'active')
  } catch {
    _user = null; _profile = null
    localStorage.removeItem('sp_token')
  }
}

export async function register (email, password, displayName) {
  await account.create(uid(), email, password, displayName)
  await account.createEmailPasswordSession(email, password)
  _user = await account.get()
  const username = makeUsername(displayName)
  _profile = await databases.createDocument(DB, C.USERS, _user.$id, {
    user_id: _user.$id, email, display_name: displayName, username,
    bio: '', avatar_url: '', cover_url: '', website: '',
    verified: false, is_private: false,
    follower_count: 0, following_count: 0, video_count: 0, like_count: 0,
    created_at: now(), updated_at: now(), last_login: now(),
  })
  localStorage.setItem('sp_token', 'active')
  return { user: _user, profile: _profile }
}

export async function login (email, password) {
  await account.createEmailPasswordSession(email, password)
  _user    = await account.get()
  _profile = await databases.getDocument(DB, C.USERS, _user.$id)
  await databases.updateDocument(DB, C.USERS, _user.$id, { last_login: now() })
  localStorage.setItem('sp_token', 'active')
  return { user: _user, profile: _profile }
}

export async function logout () {
  await account.deleteSession('current')
  _user = null; _profile = null
  localStorage.removeItem('sp_token')
}

export async function resetPassword (email) {
  await account.createRecovery(email, `${window.location.origin}/reset-password`)
}

export async function confirmReset (userId, secret, password) {
  await account.updateRecovery(userId, secret, password)
}

export async function updatePassword (newPw, oldPw) {
  await account.updatePassword(newPw, oldPw)
}

export function currentUser    () { return _user    }
export function currentProfile () { return _profile }
export function isLoggedIn     () { return !!_user  }
export function setProfile (p)  { _profile = p }

// social login functions 

//import { account } from '@/config/appwrite'
import { OAuthProvider } from 'appwrite'

const success = window.location.origin + '/'
const failure = window.location.origin + '/login'

export function loginWithGoogle() {
    return account.createOAuth2Session(
        OAuthProvider.Google,
        success,
        failure
    )
}

export function loginWithApple() {
    return account.createOAuth2Session(
        OAuthProvider.Apple,
        success,
        failure
    )
}

export function loginWithGithub() {
    return account.createOAuth2Session(
        OAuthProvider.Github,
        success,
        failure
    )
}

export function loginWithFacebook() {
    return account.createOAuth2Session(
        OAuthProvider.Facebook,
        success,
        failure
    )
}
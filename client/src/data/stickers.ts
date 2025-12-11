// Sticker packs data - using emoji-based stickers for simplicity
export interface Sticker {
  id: string;
  emoji: string;
  name: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: Sticker[];
}

export const stickerPacks: StickerPack[] = [
  {
    id: 'emotions',
    name: 'Emotions',
    icon: '😀',
    stickers: [
      { id: 'e1', emoji: '😀', name: 'grinning' },
      { id: 'e2', emoji: '😃', name: 'smiley' },
      { id: 'e3', emoji: '😄', name: 'smile' },
      { id: 'e4', emoji: '😁', name: 'grin' },
      { id: 'e5', emoji: '😆', name: 'laughing' },
      { id: 'e6', emoji: '😅', name: 'sweat_smile' },
      { id: 'e7', emoji: '🤣', name: 'rofl' },
      { id: 'e8', emoji: '😂', name: 'joy' },
      { id: 'e9', emoji: '🙂', name: 'slightly_smiling' },
      { id: 'e10', emoji: '😊', name: 'blush' },
      { id: 'e11', emoji: '😇', name: 'innocent' },
      { id: 'e12', emoji: '🥰', name: 'smiling_hearts' },
      { id: 'e13', emoji: '😍', name: 'heart_eyes' },
      { id: 'e14', emoji: '🤩', name: 'star_struck' },
      { id: 'e15', emoji: '😘', name: 'kissing_heart' },
      { id: 'e16', emoji: '😗', name: 'kissing' },
      { id: 'e17', emoji: '😚', name: 'kissing_closed_eyes' },
      { id: 'e18', emoji: '😋', name: 'yum' },
      { id: 'e19', emoji: '😛', name: 'stuck_out_tongue' },
      { id: 'e20', emoji: '😜', name: 'stuck_out_tongue_winking' },
      { id: 'e21', emoji: '🤪', name: 'zany' },
      { id: 'e22', emoji: '😝', name: 'stuck_out_tongue_closed_eyes' },
      { id: 'e23', emoji: '🤑', name: 'money_mouth' },
      { id: 'e24', emoji: '🤗', name: 'hugs' },
    ]
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: '👍',
    stickers: [
      { id: 'g1', emoji: '👍', name: 'thumbsup' },
      { id: 'g2', emoji: '👎', name: 'thumbsdown' },
      { id: 'g3', emoji: '👌', name: 'ok_hand' },
      { id: 'g4', emoji: '✌️', name: 'v' },
      { id: 'g5', emoji: '🤞', name: 'crossed_fingers' },
      { id: 'g6', emoji: '🤟', name: 'love_you' },
      { id: 'g7', emoji: '🤘', name: 'metal' },
      { id: 'g8', emoji: '🤙', name: 'call_me' },
      { id: 'g9', emoji: '👋', name: 'wave' },
      { id: 'g10', emoji: '🤚', name: 'raised_back_of_hand' },
      { id: 'g11', emoji: '✋', name: 'hand' },
      { id: 'g12', emoji: '🖐️', name: 'raised_hand_with_fingers' },
      { id: 'g13', emoji: '👏', name: 'clap' },
      { id: 'g14', emoji: '🙌', name: 'raised_hands' },
      { id: 'g15', emoji: '🤝', name: 'handshake' },
      { id: 'g16', emoji: '🙏', name: 'pray' },
      { id: 'g17', emoji: '💪', name: 'muscle' },
      { id: 'g18', emoji: '🦾', name: 'mechanical_arm' },
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: '❤️',
    stickers: [
      { id: 'h1', emoji: '❤️', name: 'red_heart' },
      { id: 'h2', emoji: '🧡', name: 'orange_heart' },
      { id: 'h3', emoji: '💛', name: 'yellow_heart' },
      { id: 'h4', emoji: '💚', name: 'green_heart' },
      { id: 'h5', emoji: '💙', name: 'blue_heart' },
      { id: 'h6', emoji: '💜', name: 'purple_heart' },
      { id: 'h7', emoji: '🖤', name: 'black_heart' },
      { id: 'h8', emoji: '🤍', name: 'white_heart' },
      { id: 'h9', emoji: '🤎', name: 'brown_heart' },
      { id: 'h10', emoji: '💔', name: 'broken_heart' },
      { id: 'h11', emoji: '💕', name: 'two_hearts' },
      { id: 'h12', emoji: '💞', name: 'revolving_hearts' },
      { id: 'h13', emoji: '💓', name: 'heartbeat' },
      { id: 'h14', emoji: '💗', name: 'heartpulse' },
      { id: 'h15', emoji: '💖', name: 'sparkling_heart' },
      { id: 'h16', emoji: '💘', name: 'cupid' },
      { id: 'h17', emoji: '💝', name: 'gift_heart' },
      { id: 'h18', emoji: '💟', name: 'heart_decoration' },
    ]
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐱',
    stickers: [
      { id: 'a1', emoji: '🐱', name: 'cat' },
      { id: 'a2', emoji: '🐶', name: 'dog' },
      { id: 'a3', emoji: '🐭', name: 'mouse' },
      { id: 'a4', emoji: '🐹', name: 'hamster' },
      { id: 'a5', emoji: '🐰', name: 'rabbit' },
      { id: 'a6', emoji: '🦊', name: 'fox' },
      { id: 'a7', emoji: '🐻', name: 'bear' },
      { id: 'a8', emoji: '🐼', name: 'panda' },
      { id: 'a9', emoji: '🐨', name: 'koala' },
      { id: 'a10', emoji: '🐯', name: 'tiger' },
      { id: 'a11', emoji: '🦁', name: 'lion' },
      { id: 'a12', emoji: '🐮', name: 'cow' },
      { id: 'a13', emoji: '🐷', name: 'pig' },
      { id: 'a14', emoji: '🐸', name: 'frog' },
      { id: 'a15', emoji: '🐵', name: 'monkey' },
      { id: 'a16', emoji: '🐔', name: 'chicken' },
      { id: 'a17', emoji: '🐧', name: 'penguin' },
      { id: 'a18', emoji: '🦄', name: 'unicorn' },
    ]
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍕',
    stickers: [
      { id: 'f1', emoji: '🍕', name: 'pizza' },
      { id: 'f2', emoji: '🍔', name: 'hamburger' },
      { id: 'f3', emoji: '🍟', name: 'fries' },
      { id: 'f4', emoji: '🌭', name: 'hotdog' },
      { id: 'f5', emoji: '🍿', name: 'popcorn' },
      { id: 'f6', emoji: '🍩', name: 'doughnut' },
      { id: 'f7', emoji: '🍪', name: 'cookie' },
      { id: 'f8', emoji: '🎂', name: 'birthday' },
      { id: 'f9', emoji: '🍰', name: 'cake' },
      { id: 'f10', emoji: '🧁', name: 'cupcake' },
      { id: 'f11', emoji: '🍫', name: 'chocolate' },
      { id: 'f12', emoji: '🍬', name: 'candy' },
      { id: 'f13', emoji: '☕', name: 'coffee' },
      { id: 'f14', emoji: '🍵', name: 'tea' },
      { id: 'f15', emoji: '🥤', name: 'cup_with_straw' },
      { id: 'f16', emoji: '🍺', name: 'beer' },
      { id: 'f17', emoji: '🍷', name: 'wine' },
      { id: 'f18', emoji: '🥂', name: 'champagne' },
    ]
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: '🎁',
    stickers: [
      { id: 'o1', emoji: '🎁', name: 'gift' },
      { id: 'o2', emoji: '🎈', name: 'balloon' },
      { id: 'o3', emoji: '🎉', name: 'tada' },
      { id: 'o4', emoji: '🎊', name: 'confetti' },
      { id: 'o5', emoji: '🏆', name: 'trophy' },
      { id: 'o6', emoji: '🥇', name: 'first_place' },
      { id: 'o7', emoji: '⭐', name: 'star' },
      { id: 'o8', emoji: '🌟', name: 'glowing_star' },
      { id: 'o9', emoji: '✨', name: 'sparkles' },
      { id: 'o10', emoji: '💫', name: 'dizzy' },
      { id: 'o11', emoji: '🔥', name: 'fire' },
      { id: 'o12', emoji: '💯', name: '100' },
      { id: 'o13', emoji: '💰', name: 'moneybag' },
      { id: 'o14', emoji: '💎', name: 'gem' },
      { id: 'o15', emoji: '🎵', name: 'musical_note' },
      { id: 'o16', emoji: '🎶', name: 'notes' },
      { id: 'o17', emoji: '📱', name: 'iphone' },
      { id: 'o18', emoji: '💻', name: 'laptop' },
    ]
  }
];

export const recentStickersKey = 'telegram_recent_stickers';

export function getRecentStickers(): Sticker[] {
  try {
    const stored = localStorage.getItem(recentStickersKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentSticker(sticker: Sticker): void {
  try {
    const recent = getRecentStickers();
    const filtered = recent.filter(s => s.id !== sticker.id);
    const updated = [sticker, ...filtered].slice(0, 24);
    localStorage.setItem(recentStickersKey, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

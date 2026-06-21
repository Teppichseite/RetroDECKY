import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { EHIDKeyboardKey } from "@decky/ui/dist/globals/steam-client/Input";

declare var SteamClient: SteamClient;

const UINPUT_TO_HID: Record<string, EHIDKeyboardKey> = {
  // Alphabet
  KEY_A: EHIDKeyboardKey.A,
  KEY_B: EHIDKeyboardKey.B,
  KEY_C: EHIDKeyboardKey.C,
  KEY_D: EHIDKeyboardKey.D,
  KEY_E: EHIDKeyboardKey.E,
  KEY_F: EHIDKeyboardKey.F,
  KEY_G: EHIDKeyboardKey.G,
  KEY_H: EHIDKeyboardKey.H,
  KEY_I: EHIDKeyboardKey.I,
  KEY_J: EHIDKeyboardKey.J,
  KEY_K: EHIDKeyboardKey.K,
  KEY_L: EHIDKeyboardKey.L,
  KEY_M: EHIDKeyboardKey.M,
  KEY_N: EHIDKeyboardKey.N,
  KEY_O: EHIDKeyboardKey.O,
  KEY_P: EHIDKeyboardKey.P,
  KEY_Q: EHIDKeyboardKey.Q,
  KEY_R: EHIDKeyboardKey.R,
  KEY_S: EHIDKeyboardKey.S,
  KEY_T: EHIDKeyboardKey.T,
  KEY_U: EHIDKeyboardKey.U,
  KEY_V: EHIDKeyboardKey.V,
  KEY_W: EHIDKeyboardKey.W,
  KEY_X: EHIDKeyboardKey.X,
  KEY_Y: EHIDKeyboardKey.Y,
  KEY_Z: EHIDKeyboardKey.Z,

  // Numbers (top row)
  KEY_1: EHIDKeyboardKey.Key_1,
  KEY_2: EHIDKeyboardKey.Key_2,
  KEY_3: EHIDKeyboardKey.Key_3,
  KEY_4: EHIDKeyboardKey.Key_4,
  KEY_5: EHIDKeyboardKey.Key_5,
  KEY_6: EHIDKeyboardKey.Key_6,
  KEY_7: EHIDKeyboardKey.Key_7,
  KEY_8: EHIDKeyboardKey.Key_8,
  KEY_9: EHIDKeyboardKey.Key_9,
  KEY_0: EHIDKeyboardKey.Key_0,

  // Controls / whitespace
  KEY_ENTER: EHIDKeyboardKey.Return,
  KEY_ESC: EHIDKeyboardKey.Escape,
  KEY_BACKSPACE: EHIDKeyboardKey.Backspace,
  KEY_TAB: EHIDKeyboardKey.Tab,
  KEY_SPACE: EHIDKeyboardKey.Space,

  // Symbols
  KEY_MINUS: EHIDKeyboardKey.Dash,
  KEY_EQUAL: EHIDKeyboardKey.Equals,
  KEY_LEFTBRACE: EHIDKeyboardKey.LeftBracket,
  KEY_RIGHTBRACE: EHIDKeyboardKey.RightBracket,
  KEY_BACKSLASH: EHIDKeyboardKey.Backslash,
  KEY_SEMICOLON: EHIDKeyboardKey.Semicolon,
  KEY_APOSTROPHE: EHIDKeyboardKey.SingleQuote,
  KEY_GRAVE: EHIDKeyboardKey.Backtick,
  KEY_COMMA: EHIDKeyboardKey.Comma,
  KEY_DOT: EHIDKeyboardKey.Period,
  KEY_SLASH: EHIDKeyboardKey.ForwardSlash,

  // Function keys
  KEY_CAPSLOCK: EHIDKeyboardKey.CapsLock,
  KEY_F1: EHIDKeyboardKey.F1,
  KEY_F2: EHIDKeyboardKey.F2,
  KEY_F3: EHIDKeyboardKey.F3,
  KEY_F4: EHIDKeyboardKey.F4,
  KEY_F5: EHIDKeyboardKey.F5,
  KEY_F6: EHIDKeyboardKey.F6,
  KEY_F7: EHIDKeyboardKey.F7,
  KEY_F8: EHIDKeyboardKey.F8,
  KEY_F9: EHIDKeyboardKey.F9,
  KEY_F10: EHIDKeyboardKey.F10,
  KEY_F11: EHIDKeyboardKey.F11,
  KEY_F12: EHIDKeyboardKey.F12,

  // Navigation
  KEY_SYSRQ: EHIDKeyboardKey.PrintScreen,
  KEY_SCROLLLOCK: EHIDKeyboardKey.ScrollLock,
  KEY_PAUSE: EHIDKeyboardKey.Break,
  KEY_INSERT: EHIDKeyboardKey.Insert,
  KEY_HOME: EHIDKeyboardKey.Home,
  KEY_PAGEUP: EHIDKeyboardKey.PageUp,
  KEY_DELETE: EHIDKeyboardKey.Delete,
  KEY_END: EHIDKeyboardKey.End,
  KEY_PAGEDOWN: EHIDKeyboardKey.PageDown,
  KEY_RIGHT: EHIDKeyboardKey.RightArrow,
  KEY_LEFT: EHIDKeyboardKey.LeftArrow,
  KEY_DOWN: EHIDKeyboardKey.DownArrow,
  KEY_UP: EHIDKeyboardKey.UpArrow,
  KEY_NUMLOCK: EHIDKeyboardKey.NumLock,

  // Keypad
  KEY_KPSLASH: EHIDKeyboardKey.KeypadForwardSlash,
  KEY_KPASTERISK: EHIDKeyboardKey.KeypadAsterisk,
  KEY_KPMINUS: EHIDKeyboardKey.KeypadDash,
  KEY_KPPLUS: EHIDKeyboardKey.KeypadPlus,
  KEY_KPENTER: EHIDKeyboardKey.KeypadEnter,
  KEY_KP1: EHIDKeyboardKey.Keypad_1,
  KEY_KP2: EHIDKeyboardKey.Keypad_2,
  KEY_KP3: EHIDKeyboardKey.Keypad_3,
  KEY_KP4: EHIDKeyboardKey.Keypad_4,
  KEY_KP5: EHIDKeyboardKey.Keypad_5,
  KEY_KP6: EHIDKeyboardKey.Keypad_6,
  KEY_KP7: EHIDKeyboardKey.Keypad_7,
  KEY_KP8: EHIDKeyboardKey.Keypad_8,
  KEY_KP9: EHIDKeyboardKey.Keypad_9,
  KEY_KP0: EHIDKeyboardKey.Keypad_0,
  KEY_KPDOT: EHIDKeyboardKey.KeypadPeriod,

  // Modifiers
  KEY_LEFTALT: EHIDKeyboardKey.LAlt,
  KEY_LEFTSHIFT: EHIDKeyboardKey.LShift,
  KEY_LEFTMETA: EHIDKeyboardKey.LWin,
  KEY_LEFTCTRL: EHIDKeyboardKey.LControl,
  KEY_RIGHTALT: EHIDKeyboardKey.RAlt,
  KEY_RIGHTSHIFT: EHIDKeyboardKey.RShift,
  KEY_RIGHTMETA: EHIDKeyboardKey.RWin,
  KEY_RIGHTCTRL: EHIDKeyboardKey.RControl,

  // Media
  KEY_VOLUMEUP: EHIDKeyboardKey.VolUp,
  KEY_VOLUMEDOWN: EHIDKeyboardKey.VolDown,
  KEY_MUTE: EHIDKeyboardKey.Mute,
  KEY_PLAYPAUSE: EHIDKeyboardKey.Play,
  KEY_STOPCD: EHIDKeyboardKey.Stop,
  KEY_NEXTSONG: EHIDKeyboardKey.Next,
  KEY_PREVIOUSSONG: EHIDKeyboardKey.Prev,
};

export const pressHotkeys = (keys: string[]) => {
  holdHotkeys(keys);
  setTimeout(() => {
    releaseHotkeys(keys);
  }, 100);
};

export const holdHotkeys = (keys: string[]) => {
  keys.forEach((key) => {
    SteamClient.Input.ControllerKeyboardSetKeyState(UINPUT_TO_HID[key], true);
  });
};

export const releaseHotkeys = (keys: string[]) => {
  keys.forEach((key) => {
    SteamClient.Input.ControllerKeyboardSetKeyState(UINPUT_TO_HID[key], false);
  });
};

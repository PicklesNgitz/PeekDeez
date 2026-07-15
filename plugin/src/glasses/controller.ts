// Glasses controller: owns the active screen + its state, maps raw SDK
touchpad events to screen actions, and re-renders on input or
now-playing changes. One screen at a time: nowplaying | transport | lyrics.
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { bridge as api } from '../bridge/client'
import { store } from '../state'
import { renderText } from './render'
import {
  nowPlayingContent, transportContent, lyricsContent,
  ScreenType
} from './content'

enum ScreenType {
  NOWPLAYING = 'nowplaying',
  TRANSPORT = 'transport',
  LYRICS = 'lyrics'
}

class GlassesController {
  private currentScreen: ScreenType = ScreenType.NOWPLAYING;
  private bridge: EvenAppBridge;

  constructor(bridge: EvenAppBridge) {
    this.bridge = bridge;
    this.initEventListeners();
    this.updateScreen();
  }

  private initEventListeners(): void {
    this.bridge.on(OsEventTypeList.TOUCHPAD_SWIPE_UP, () => {
      this.handleSwipeUp();
    });

    this.bridge.on(OsEventTypeList.TOUCHPAD_SWIPE_DOWN, () => {
      this.handleSwipeDown();
    });

    store.subscribe(() => {
      this.updateScreen();
    });
  }

  private handleSwipeUp(): void {
    switch (this.currentScreen) {
      case ScreenType.NOWPLAYING:
        this.currentScreen = ScreenType.TRANSPORT;
        break;
      case ScreenType.TRANSPORT:
        this.currentScreen = ScreenType.LYRICS;
        break;
      case ScreenType.LYRICS:
        this.currentScreen = ScreenType.NOWPLAYING;
        break;
    }
    this.updateScreen();
  }

  private handleSwipeDown(): void {
    switch (this.currentScreen) {
      case ScreenType.NOWPLAYING:
        this.currentScreen = ScreenType.LYRICS;
        break;
      case ScreenType.TRANSPORT:
        this.currentScreen = ScreenType.NOWPLAYING;
        break;
      case ScreenType.LYRICS:
        this.currentScreen = ScreenType.TRANSPORT;
        break;
    }
    this.updateScreen();
  }

  private updateScreen(): void {
    let content = '';
    switch (this.currentScreen) {
      case ScreenType.NOWPLAYING:
        content = nowPlayingContent(store.getState());
        break;
      case ScreenType.TRANSPORT:
        content = transportContent(store.getState());
        break;
      case ScreenType.LYRICS:
        content = lyricsContent(store.getState());
        break;
    }
    renderText(content);
  }
}

// Initialize the controller with the bridge instance
const glassesController = new GlassesController(api);

// Handle initial screen update
store.subscribe(() => {
  glassesController.updateScreen();
});
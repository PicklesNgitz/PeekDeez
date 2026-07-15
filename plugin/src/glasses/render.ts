// Glasses display: one full-screen text container (id 1) created once at
// startup; live updates via textContainerUpgrade with a fresh content string.
// Content is plain multi-line text — the G2 renders it as-is.
import {
  type EvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
} from '@evenrealities/even_hub_sdk'

const CONTAINER_ID = 1

export async function createDisplay(bridge: EvenAppBridge): Promise<boolean> {
  const text = new TextContainerProperty({
    xPosition: 0, yPosition: 0, width: 576, height: 288,
    borderWidth: 0, paddingLength: 4, containerID: CONTAINER_ID,
    containerName: 'root', content: '', isEventCapture: 1,
  })
  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [text] }),
  )
  return result === 0
}

// Push a content string to the glasses display.
export async function renderText(bridge: EvenAppBridge, content: string): Promise<void> {
  try {
    await bridge.textContainerUpgrade({ containerID: CONTAINER_ID, content })
  } catch (e) {
    // Upgrades can race with reconnects; swallow — next event re-renders.
    console.warn('textContainerUpgrade failed', e)
  }
}

/**
 * UI rule 7: the iPhone keyboard covers the bottom of the screen and does not resize the page.
 * Moving a text box and its button to the top keeps both above the keyboard. Call it when the box
 * gets focus. The page needs room below the button (`keyboard-room`) to scroll that far.
 */
export function keepAboveKeyboard(element: HTMLElement | null) {
  const align = () => element?.scrollIntoView({ block: "start" });
  align();
  window.visualViewport?.addEventListener("resize", align, { once: true });
  setTimeout(align, 400);
}

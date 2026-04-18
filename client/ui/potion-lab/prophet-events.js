// prophet-events.js
// Thin event-bus wrappers so Phaser scenes can react to Prophet UI actions.

export function dispatchProphetStoryWritten(goalText) {
  window.dispatchEvent(new CustomEvent('prophet:storyWritten', {
    detail: { goalText },
  }));
}

export function dispatchProphetHeadlineReady(headline) {
  window.dispatchEvent(new CustomEvent('prophet:headlineReady', {
    detail: { headline },
  }));
}

export function dispatchProphetStoryComplete(story) {
  window.dispatchEvent(new CustomEvent('prophet:storyComplete', {
    detail: { story },
  }));
}

export function dispatchProphetFullEdition() {
  window.dispatchEvent(new CustomEvent('prophet:fullEdition'));
}

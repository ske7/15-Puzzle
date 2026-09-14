import { createApp } from 'vue';

// Runs a composable inside a real component's setup() so lifecycle hooks
// (onMounted, onBeforeUnmount, watch) behave exactly as they do in the app.
// Returns the composable's result plus an unmount function to trigger teardown hooks.
export function withSetup<T>(composable: () => T): [T, () => void] {
  let result!: T;
  const app = createApp({
    setup() {
      result = composable();
      return () => null;
    },
  });
  const el = document.createElement('div');
  document.body.appendChild(el);
  app.mount(el);
  return [result, () => {
    app.unmount();
    el.remove();
  }];
}

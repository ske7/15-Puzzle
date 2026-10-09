import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { boardRoom, provideBoardRoom, useBoardRoom } from '@/composables/useBoardRoom';
import { withSetup } from '../../withSetup';

// The page column on a 375x548 phone, as laid out in a real browser.
const PHONE_LAYOUT: [string, number, number][] = [
  ['header', 6, 32],
  ['avg-wrapper', 33, 146],
  ['top-info-panel', 146, 175],
  ['board', 175, 441],
  ['action-panel', 451, 488],
  ['bottom-info-panel', 488, 543]
];

function placeAt(element: Element, top: number, bottom: number): void {
  element.getBoundingClientRect = () => ({ top, bottom, height: bottom - top } as DOMRect);
}

function layOut(wrapper: Element, layout: [string, number, number][]): void {
  for (const [name, top, bottom] of layout) {
    placeAt(wrapper.querySelector(`.${name}`)!, top, bottom);
  }
}

function pageColumn(): HTMLElement {
  const wrapper = document.createElement('div');
  for (const [name] of PHONE_LAYOUT) {
    const child = document.createElement('div');
    child.className = name;
    wrapper.append(child);
  }
  wrapper.querySelector<HTMLElement>('.header')!.style.marginTop = '6px';
  wrapper.querySelector<HTMLElement>('.action-panel')!.style.marginTop = '10px';
  layOut(wrapper, PHONE_LAYOUT);
  return wrapper;
}

let resizeCallbacks: (() => void)[] = [];
let observed: Element[] = [];

class ResizeObserverSpy {
  constructor(callback: () => void) {
    resizeCallbacks.push(callback);
  }

  observe(element: Element): void {
    observed.push(element);
  }

  unobserve(): void {
    return undefined;
  }

  disconnect(): void {
    observed = [];
  }
}

function resizeAll(): void {
  for (const callback of resizeCallbacks) {
    callback();
  }
}

function column(wrapper: VueWrapper): HTMLElement {
  return (wrapper.vm as unknown as { wrapper: HTMLElement }).wrapper;
}

async function showColumn(wrapper: VueWrapper): Promise<HTMLElement> {
  (wrapper.vm as unknown as { shown: boolean }).shown = true;
  await nextTick();
  await nextTick();
  layOut(column(wrapper), PHONE_LAYOUT);
  return column(wrapper);
}

function mountPage(frozen: Ref<boolean>) {
  let room: Ref<number> | undefined;
  const Page = defineComponent({
    setup() {
      const wrapper = ref<HTMLElement>();
      const shown = ref(false);
      room = provideBoardRoom(wrapper, () => frozen.value);
      return { wrapper, shown };
    },

    render() {
      return h('div', [
        this.shown
          ? h('div', { ref: 'wrapper' }, PHONE_LAYOUT.map(([name]) => h('div', { class: name, style: name === 'header' ? 'margin-top: 6px' : undefined })))
          : null
      ]);
    }
  });
  const wrapper = mount(Page, { attachTo: document.body });
  mounted = wrapper;
  return { wrapper, room: () => room!.value };
}

let mounted: VueWrapper | undefined;

describe('useBoardRoom', () => {
  beforeEach(() => {
    resizeCallbacks = [];
    observed = [];
    vi.stubGlobal('ResizeObserver', ResizeObserverSpy);
    Object.defineProperty(window, 'innerHeight', { value: 548, configurable: true });
  });

  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  });

  describe('boardRoom', () => {
    it('leaves the board what the screen has left once the rest of the page is laid out', () => {
      // The page around the board takes 543 - 0 - 266 = 277px, and #app pads 5px below.
      expect(boardRoom(pageColumn())).toBe(548 - 5 - 277);
    });

    it('ignores what takes no room in the column: hidden, absolute and fixed blocks', () => {
      const wrapper = pageColumn();
      for (const position of ['absolute', 'fixed']) {
        const floating = document.createElement('div');
        floating.style.position = position;
        placeAt(floating, 0, 900);
        wrapper.append(floating);
      }
      const hidden = document.createElement('div');
      hidden.style.display = 'none';
      placeAt(hidden, 600, 900);
      wrapper.append(hidden);
      expect(boardRoom(wrapper)).toBe(266);
    });
  });

  it('is unlimited where no page provides it', () => {
    const [room, unmount] = withSetup(() => useBoardRoom());
    expect(room.value).toBe(Infinity);
    unmount();
  });

  it('measures once the page column renders and whenever a block in it resizes', async () => {
    const { wrapper, room } = mountPage(ref(false));
    window.dispatchEvent(new Event('resize'));
    expect(room()).toBe(Infinity);
    const page = await showColumn(wrapper);
    expect(observed).toHaveLength(PHONE_LAYOUT.length);
    resizeAll();
    expect(room()).toBe(266);
    // Hiding the averages leaves a 23px bar, and everything below moves up by the 90px saved.
    layOut(page, PHONE_LAYOUT.map(([name, top, bottom]): [string, number, number] => {
      if (name === 'avg-wrapper') {
        return [name, top, top + 23];
      }
      return top > 33 ? [name, top - 90, bottom - 90] : [name, top, bottom];
    }));
    resizeAll();
    expect(room()).toBe(266 + 90);
  });

  it('measures again when the window resizes', async () => {
    const { wrapper, room } = mountPage(ref(false));
    await showColumn(wrapper);
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    window.dispatchEvent(new Event('resize'));
    expect(room()).toBe(600 - 5 - 277);
  });

  it('watches blocks that join the column later, like the averages panel after it loads', async () => {
    const { wrapper } = mountPage(ref(false));
    const page = await showColumn(wrapper);
    const late = document.createElement('div');
    page.append(late);
    await vi.waitFor(() => {
      expect(observed).toContain(late);
    });
    (wrapper.vm as unknown as { shown: boolean }).shown = false;
    await nextTick();
    await nextTick();
    expect(observed).toEqual([]);
  });

  it('holds the room still during a solve and catches up once it ends', async () => {
    const frozen = ref(false);
    const { wrapper, room } = mountPage(frozen);
    const page = await showColumn(wrapper);
    resizeAll();
    expect(room()).toBe(266);
    frozen.value = true;
    await nextTick();
    placeAt(page.querySelector('.bottom-info-panel')!, 488, 570);
    resizeAll();
    expect(room()).toBe(266);
    frozen.value = false;
    await nextTick();
    expect(room()).toBe(266 - 27);
  });
});

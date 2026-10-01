import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegModal from '../RegModal.vue';
import { useBaseStore } from '../../stores/base';
import type { Response, UserRecord } from '@/types';

vi.mock('../../composables/useFetchAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../composables/useFetchAPI')>();
  return { ...actual, usePostFetchAPI: vi.fn() };
});

import { usePostFetchAPI } from '../../composables/useFetchAPI';

// Only reloadPage is replaced; every other util keeps its real implementation.
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>();
  return { ...actual, reloadPage: vi.fn() };
});

import { reloadPage } from '@/utils';

interface RegModalInternals {
  headerText: string;
  submitButtonText: string;
  invalidFields: { name: boolean; email: boolean; password: boolean };
  errorMsg: string[];
  resetPasswordMode: boolean;
  sentResetEmail: boolean;
}

function internals(wrapper: VueWrapper): RegModalInternals {
  return wrapper.vm as unknown as RegModalInternals;
}

let currentWrapper: VueWrapper | undefined;
function mountModal(props: { formType: string; resetToken?: string; email?: string }) {
  currentWrapper = mount(RegModal, { props, attachTo: document.body });
  return currentWrapper;
}

async function fillAndSubmit(
  wrapper: VueWrapper,
  fields: { name?: string; email?: string; password?: string }
): Promise<void> {
  if (fields.name !== undefined) {
    await wrapper.find('#username').setValue(fields.name);
  }
  if (fields.email !== undefined) {
    await wrapper.find('#email').setValue(fields.email);
  }
  if (fields.password !== undefined) {
    await wrapper.find('#password').setValue(fields.password);
  }
  await wrapper.find('form').trigger('submit');
}

describe('RegModal', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.mocked(usePostFetchAPI).mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    document.body.innerHTML = '';
  });

  describe('form mode', () => {
    it('shows the login header/button and no username field by default', () => {
      const wrapper = mountModal({ formType: 'login' });
      expect(internals(wrapper).headerText).toBe('Login into your account');
      expect(internals(wrapper).submitButtonText).toBe('Login');
      expect(wrapper.find('#username').exists()).toBe(false);
      expect(wrapper.find('#password').exists()).toBe(true);
      expect(wrapper.find('.forgot-password').exists()).toBe(true);
    });

    it('shows the register header/button, username field, and the required-fields legend', () => {
      const wrapper = mountModal({ formType: 'register' });
      expect(internals(wrapper).headerText).toBe('Register your account');
      expect(internals(wrapper).submitButtonText).toBe('Register');
      expect(wrapper.find('#username').exists()).toBe(true);
      expect(wrapper.find('legend').exists()).toBe(true);
      expect(wrapper.find('.forgot-password').exists()).toBe(false);
    });

    it('hides the legend once every register field is filled', async () => {
      const wrapper = mountModal({ formType: 'register' });
      await fillAndSubmit(wrapper, { name: 'gamer_01', email: 'gamer@example.com', password: 'secret1' });
      expect(wrapper.find('legend').exists()).toBe(false);
    });

    it('shows the set-password header/button and pre-fills the email from props', async () => {
      const wrapper = mountModal({ formType: 'set-password', email: 'gamer@example.com' });
      expect(internals(wrapper).headerText).toBe('Set new password');
      expect(internals(wrapper).submitButtonText).toBe('Submit');
      await wrapper.vm.$nextTick();
      expect(wrapper.find<HTMLInputElement>('#email').element.value).toBe('gamer@example.com');
      expect(wrapper.find('#username').exists()).toBe(false);
      expect(wrapper.find('.forgot-password').exists()).toBe(false);
    });

    it('leaves the email blank on set-password when no email prop is given', async () => {
      const wrapper = mountModal({ formType: 'set-password' });
      await wrapper.vm.$nextTick();
      expect(wrapper.find<HTMLInputElement>('#email').element.value).toBe('');
    });

    it('switches to reset-password mode, hiding the password field', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await wrapper.find('.forgot-password a').trigger('click');
      expect(internals(wrapper).headerText).toBe('Reset you password');
      expect(internals(wrapper).submitButtonText).toBe('Reset');
      expect(wrapper.find('#password').exists()).toBe(false);
    });
  });

  describe('field validation outside reset-password mode', () => {
    it('validates a register form submitted with nothing typed at all', async () => {
      // The fields start as real empty strings, so checkFields can .trim() them instead
      // of throwing on undefined.
      const wrapper = mountModal({ formType: 'register' });
      await fillAndSubmit(wrapper, {});
      expect(internals(wrapper).invalidFields.name).toBe(true);
      expect(internals(wrapper).invalidFields.email).toBe(true);
      expect(internals(wrapper).invalidFields.password).toBe(true);
      expect(usePostFetchAPI).not.toHaveBeenCalled();
    });

    it('rejects an empty email and empty password on login', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: '', password: '' });
      expect(internals(wrapper).invalidFields.email).toBe(true);
      expect(internals(wrapper).invalidFields.password).toBe(true);
      expect(internals(wrapper).errorMsg).toContain('Invalid email address');
      expect(usePostFetchAPI).not.toHaveBeenCalled();
    });

    it('rejects a malformed email', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'not-an-email', password: 'secret1' });
      expect(internals(wrapper).invalidFields.email).toBe(true);
      expect(internals(wrapper).errorMsg).toContain('Invalid email address');
    });

    it.each([
      ['plus addressing', 'leo+15puzzle@gmail.com'],
      ['an apostrophe', "o'brien@example.ie"],
      ['dots and hyphens', 'first.last-name@my-mail.co.uk'],
      ['a long ending', 'leo@example.international'],
      ['an internationalised ending', 'leo@example.xn--vermgensberatung-pwb']
    ])('accepts a real address with %s', async (_case, email) => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email, password: 'secret1' });
      expect(internals(wrapper).invalidFields.email).toBe(false);
      expect(internals(wrapper).errorMsg).not.toContain('Invalid email address');
    });

    it.each([
      ['a trailing dot', 'leo@gmail.com.'],
      ['a doubled dot in the domain', 'leo@gmail..com'],
      ['an ending made of dots', 'leo@gmail.c..'],
      ['an underscore in the domain', 'leo@my_mail.com'],
      ['a leading dot in the name', '.leo@gmail.com'],
      ['a doubled dot in the name', 'le..o@gmail.com'],
      ['a space', 'leo @gmail.com'],
      ['no dot in the domain', 'leo@localhost']
    ])('rejects a typo: %s', async (_case, email) => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email, password: 'secret1' });
      expect(internals(wrapper).invalidFields.email).toBe(true);
      expect(internals(wrapper).errorMsg).toContain('Invalid email address');
    });

    it('rejects a password shorter than 6 characters', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'ab' });
      expect(internals(wrapper).invalidFields.password).toBe(true);
    });

    it('accepts valid login credentials', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      expect(internals(wrapper).invalidFields.email).toBe(false);
      expect(internals(wrapper).invalidFields.password).toBe(false);
      expect(usePostFetchAPI).toHaveBeenCalledWith('login', expect.any(String));
    });

    it('clears a single invalid flag on focus, leaving the others untouched', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: '', password: '' });
      await wrapper.find('#email').trigger('focus');
      expect(internals(wrapper).invalidFields.email).toBe(false);
      expect(internals(wrapper).invalidFields.password).toBe(true);
      await wrapper.find('#password').trigger('focus');
      expect(internals(wrapper).invalidFields.password).toBe(false);
    });

    it('clears the username invalid flag on focus', async () => {
      const wrapper = mountModal({ formType: 'register' });
      await fillAndSubmit(wrapper, { name: '', email: 'gamer@example.com', password: 'secret1' });
      expect(internals(wrapper).invalidFields.name).toBe(true);
      await wrapper.find('#username').trigger('focus');
      expect(internals(wrapper).invalidFields.name).toBe(false);
    });

    it('rejects an empty username on register', async () => {
      const wrapper = mountModal({ formType: 'register' });
      await fillAndSubmit(wrapper, { name: '', email: 'gamer@example.com', password: 'secret1' });
      expect(internals(wrapper).invalidFields.name).toBe(true);
      expect(internals(wrapper).errorMsg)
        .toContain('Allowed characters for username: letters (a-z), numbers, underscores(_) and hyphens(-)');
    });

    it('rejects a username with disallowed characters', async () => {
      const wrapper = mountModal({ formType: 'register' });
      await fillAndSubmit(wrapper, { name: 'bad name!', email: 'gamer@example.com', password: 'secret1' });
      expect(internals(wrapper).invalidFields.name).toBe(true);
    });

    it('accepts a valid register submission', async () => {
      const wrapper = mountModal({ formType: 'register' });
      await fillAndSubmit(wrapper, { name: 'gamer_01', email: 'gamer@example.com', password: 'secret1' });
      expect(internals(wrapper).invalidFields.name).toBe(false);
      expect(usePostFetchAPI).toHaveBeenCalledWith('register', expect.any(String));
      const body = vi.mocked(usePostFetchAPI).mock.calls[0][1] as string;
      const parsed = JSON.parse(body) as { user: { password_confirmation: string } };
      expect(parsed.user.password_confirmation).toBe('secret1');
    });
  });

  describe('field validation in reset-password mode', () => {
    it('only requires a non-empty email, skipping password and email-format checks', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await wrapper.find('.forgot-password a').trigger('click');
      await fillAndSubmit(wrapper, { email: 'not-a-real-email' });
      expect(internals(wrapper).invalidFields.email).toBe(false);
      expect(usePostFetchAPI).toHaveBeenCalledWith('reset_password', expect.any(String));
    });

    it('rejects an empty email', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await wrapper.find('.forgot-password a').trigger('click');
      await fillAndSubmit(wrapper, { email: '' });
      expect(internals(wrapper).invalidFields.email).toBe(true);
      expect(usePostFetchAPI).not.toHaveBeenCalled();
    });
  });

  describe('submission routing', () => {
    it('posts to set_password for the set-password form', async () => {
      const wrapper = mountModal({ formType: 'set-password', email: 'gamer@example.com' });
      await fillAndSubmit(wrapper, { password: 'secret1' });
      expect(usePostFetchAPI).toHaveBeenCalledWith('set_password', expect.any(String));
    });

    it('does not resubmit while a request is already in flight', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      expect(usePostFetchAPI).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset-password submission', () => {
    it('shows the sent-email confirmation on success', async () => {
      vi.mocked(usePostFetchAPI).mockResolvedValue({ status: 'ok', game_id: 0 } satisfies Response);
      const wrapper = mountModal({ formType: 'login' });
      await wrapper.find('.forgot-password a').trigger('click');
      await fillAndSubmit(wrapper, { email: 'gamer@example.com' });
      await vi.waitFor(() => {
        expect(internals(wrapper).sentResetEmail).toBe(true);
      });
      expect(wrapper.find('.after-sent-email').exists()).toBe(true);
      await wrapper.find('.after-sent-email + .buttons button').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('shows the real error message and stays on the form when the request fails', async () => {
      vi.mocked(usePostFetchAPI).mockRejectedValue(new Error('user not found'));
      const wrapper = mountModal({ formType: 'login' });
      await wrapper.find('.forgot-password a').trigger('click');
      await fillAndSubmit(wrapper, { email: 'gamer@example.com' });
      await vi.waitFor(() => {
        expect(internals(wrapper).errorMsg).toContain('user not found');
      });
      expect(internals(wrapper).sentResetEmail).toBe(false);
    });
  });

  describe('login/register submission', () => {
    it('stores the token, updates the username, loads averages, and closes on success', async () => {
      const store = useBaseStore();
      const loadAveragesSpy = vi.spyOn(store, 'loadAverages');
      const initSpy = vi.spyOn(store, 'initAfterNewPuzzleSize');
      vi.mocked(usePostFetchAPI).mockResolvedValue(
        { status: 'ok', game_id: 0, token: 'real-session-token', name: 'gamer_01' } satisfies Response
      );
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      await vi.waitFor(() => {
        expect(wrapper.emitted('close')).toHaveLength(1);
      });
      expect(store.token).toBe('real-session-token');
      expect(localStorage.getItem('token')).toBe('real-session-token');
      expect(store.userName).toBe('gamer_01');
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(loadAveragesSpy).toHaveBeenCalledTimes(1);
    });

    it('reloads the page instead of setting the username when the URL carries a query string', async () => {
      // Real URL via the History API; only the app's own reloadPage seam is stubbed,
      // because location.reload is a non-configurable own property and cannot be spied.
      window.history.replaceState({}, '', '/?game_id=42');
      try {
        const store = useBaseStore();
        vi.mocked(usePostFetchAPI).mockResolvedValue(
          { status: 'ok', game_id: 0, token: 'real-session-token', name: 'gamer_01' } satisfies Response
        );
        const wrapper = mountModal({ formType: 'login' });
        await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
        await vi.waitFor(() => {
          expect(wrapper.emitted('close')).toHaveLength(1);
        });
        expect(store.userName).toBeUndefined();
        expect(reloadPage).toHaveBeenCalledTimes(1);
      } finally {
        window.history.replaceState({}, '', '/');
      }
    });

    it('shows the real error message and re-enables the form on failure', async () => {
      vi.mocked(usePostFetchAPI).mockRejectedValue(new Error('invalid credentials'));
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      await vi.waitFor(() => {
        expect(internals(wrapper).errorMsg).toContain('invalid credentials');
      });
      expect(wrapper.emitted('close')).toBeUndefined();
      expect(wrapper.find('fieldset').attributes('disabled')).toBeUndefined();
    });

    it('syncs real local records that beat the current (empty) local records', async () => {
      const store = useBaseStore();
      const setTimeSpy = vi.spyOn(store, 'setTimeRecord');
      const setMovesSpy = vi.spyOn(store, 'setMovesRecord');
      const setFMCBlitzSpy = vi.spyOn(store, 'setFMCBlitzRecord');
      const userRecords: UserRecord[] = [
        {
          id: 1, record_id: 1, record_type: 'time', puzzle_type: 'standard', puzzle_size: 5,
          time: 15000, moves: 40, tps: '2.667'
        },
        {
          id: 2, record_id: 2, record_type: 'moves', puzzle_type: 'standard', puzzle_size: 5,
          time: 20000, moves: 30, tps: '1.5'
        },
        {
          id: 3, record_id: 3, record_type: 'fmc_blitz_moves', puzzle_type: 'standard', puzzle_size: 4,
          time: 0, moves: 25, tps: '0'
        }
      ];
      vi.mocked(usePostFetchAPI).mockResolvedValue({
        status: 'ok',
        game_id: 0,
        token: 'real-session-token',
        name: 'gamer_01',
        stats: { user_data: { created_at: '', last_game_at: '', num_finished_games: 0, play_time: 0, id: 1 }, user_records: userRecords }
      } satisfies Response);
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      await vi.waitFor(() => {
        expect(wrapper.emitted('close')).toHaveLength(1);
      });
      expect(setTimeSpy).toHaveBeenCalledWith(15000, 40, 5, false, true);
      expect(setMovesSpy).toHaveBeenCalledWith(30, 20000, 5, false, true);
      expect(setFMCBlitzSpy).toHaveBeenCalledWith(25, 0, 4, true);
    });

    it('does not sync anything when the server reports no records', async () => {
      const store = useBaseStore();
      const setRecordsSpy = vi.spyOn(store, 'setRecords');
      vi.mocked(usePostFetchAPI).mockResolvedValue({
        status: 'ok',
        game_id: 0,
        token: 'real-session-token',
        name: 'gamer_01',
        stats: { user_data: { created_at: '', last_game_at: '', num_finished_games: 0, play_time: 0, id: 1 }, user_records: [] }
      } satisfies Response);
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      await vi.waitFor(() => {
        expect(wrapper.emitted('close')).toHaveLength(1);
      });
      expect(setRecordsSpy).not.toHaveBeenCalled();
    });

    async function loginWithRecords(userRecords: UserRecord[]): Promise<VueWrapper> {
      vi.mocked(usePostFetchAPI).mockResolvedValue({
        status: 'ok',
        game_id: 0,
        token: 'real-session-token',
        name: 'gamer_01',
        stats: { user_data: { created_at: '', last_game_at: '', num_finished_games: 0, play_time: 0, id: 1 }, user_records: userRecords }
      } satisfies Response);
      const wrapper = mountModal({ formType: 'login' });
      await fillAndSubmit(wrapper, { email: 'gamer@example.com', password: 'secret1' });
      await vi.waitFor(() => {
        expect(wrapper.emitted('close')).toHaveLength(1);
      });
      return wrapper;
    }

    it('prefers a strictly better incoming value over an existing record', async () => {
      const store = useBaseStore();
      store.setTimeRecord(20000, 50, 5, false, true);
      store.setMovesRecord(60, 25000, 5, false, true);
      const setTimeSpy = vi.spyOn(store, 'setTimeRecord');
      const setMovesSpy = vi.spyOn(store, 'setMovesRecord');
      await loginWithRecords([
        {
          id: 1, record_id: 1, record_type: 'time', puzzle_type: 'standard', puzzle_size: 5,
          time: 15000, moves: 99, tps: '1'
        },
        {
          id: 2, record_id: 2, record_type: 'moves', puzzle_type: 'standard', puzzle_size: 5,
          time: 30000, moves: 45, tps: '1.5'
        }
      ]);
      expect(setTimeSpy).toHaveBeenCalledWith(15000, 99, 5, false, true);
      expect(setMovesSpy).toHaveBeenCalledWith(45, 30000, 5, false, true);
    });

    it('prefers a tied primary value with a better secondary value', async () => {
      const store = useBaseStore();
      store.setTimeRecord(15000, 99, 5, false, true);
      store.setMovesRecord(45, 30000, 5, false, true);
      store.setFMCBlitzRecord(40, 10, 4, true);
      const setTimeSpy = vi.spyOn(store, 'setTimeRecord');
      const setMovesSpy = vi.spyOn(store, 'setMovesRecord');
      const setFMCBlitzSpy = vi.spyOn(store, 'setFMCBlitzRecord');
      await loginWithRecords([
        {
          id: 1, record_id: 1, record_type: 'time', puzzle_type: 'standard', puzzle_size: 5,
          time: 15000, moves: 50, tps: '3'
        },
        {
          id: 2, record_id: 2, record_type: 'moves', puzzle_type: 'standard', puzzle_size: 5,
          time: 25000, moves: 45, tps: '1.8'
        },
        {
          id: 3, record_id: 3, record_type: 'fmc_blitz_moves', puzzle_type: 'standard', puzzle_size: 4,
          time: 5, moves: 40, tps: '0'
        }
      ]);
      expect(setTimeSpy).toHaveBeenCalledWith(15000, 50, 5, false, true);
      expect(setMovesSpy).toHaveBeenCalledWith(45, 25000, 5, false, true);
      expect(setFMCBlitzSpy).toHaveBeenCalledWith(40, 5, 4, true);
    });

    it('keeps the existing record when the incoming value is no better', async () => {
      const store = useBaseStore();
      store.setTimeRecord(15000, 50, 5, false, true);
      store.setMovesRecord(45, 25000, 5, false, true);
      store.setFMCBlitzRecord(40, 5, 4, true);
      const setTimeSpy = vi.spyOn(store, 'setTimeRecord');
      const setMovesSpy = vi.spyOn(store, 'setMovesRecord');
      const setFMCBlitzSpy = vi.spyOn(store, 'setFMCBlitzRecord');
      await loginWithRecords([
        {
          id: 1, record_id: 1, record_type: 'time', puzzle_type: 'standard', puzzle_size: 5,
          time: 16000, moves: 1, tps: '1'
        },
        {
          id: 2, record_id: 2, record_type: 'moves', puzzle_type: 'standard', puzzle_size: 5,
          time: 1, moves: 46, tps: '1'
        },
        {
          id: 3, record_id: 3, record_type: 'fmc_blitz_moves', puzzle_type: 'standard', puzzle_size: 4,
          time: 1, moves: 41, tps: '0'
        }
      ]);
      expect(setTimeSpy).not.toHaveBeenCalled();
      expect(setMovesSpy).not.toHaveBeenCalled();
      expect(setFMCBlitzSpy).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('emits close when the cancel button is clicked', async () => {
      const wrapper = mountModal({ formType: 'login' });
      await wrapper.find('button[type="button"]').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('stops propagation on an outside click without emitting close, unlike other modals', async () => {
      const wrapper = mountModal({ formType: 'login' });
      const event = new MouseEvent('click', { bubbles: true });
      const stopSpy = vi.spyOn(event, 'stopPropagation');
      document.body.dispatchEvent(event);
      await wrapper.vm.$nextTick();
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });
});

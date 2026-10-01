import { computed, ref } from 'vue';

export function useModalState() {
  const showInfo = ref(false);
  const showWinModal = ref(false);
  const showConfig = ref(false);
  const showImageGallery = ref(false);
  const showRegModal = ref(false);
  const showUserAccount = ref(false);
  const showLeaderBoard = ref(false);
  const showLiveRecords = ref(false);
  const showAddScramble = ref(false);
  const showScrambleList = ref(false);

  const showModal = computed((): boolean => {
    return [
      showConfig.value,
      showInfo.value,
      showWinModal.value,
      showImageGallery.value,
      showRegModal.value,
      showUserAccount.value,
      showLeaderBoard.value,
      showLiveRecords.value,
      showAddScramble.value,
      showScrambleList.value
    ].some(Boolean);
  });

  return {
    showInfo,
    showWinModal,
    showConfig,
    showImageGallery,
    showRegModal,
    showUserAccount,
    showLeaderBoard,
    showLiveRecords,
    showAddScramble,
    showScrambleList,
    showModal
  };
}

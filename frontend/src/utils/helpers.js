export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Не удалось скопировать: ', err);
    return false;
  }
};

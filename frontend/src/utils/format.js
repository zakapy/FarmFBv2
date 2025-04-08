export const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };
  
  export const truncate = (text, length = 30) => {
    return text.length > length ? text.slice(0, length) + '...' : text;
  };
  
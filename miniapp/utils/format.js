function formatTime(isoString) {
  if (!isoString) {
    return '';
  }

  const date = new Date(isoString);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}`;
}

module.exports = {
  formatTime
};

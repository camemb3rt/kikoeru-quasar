const cueStartPattern = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->/;

function formatLrcTimestamp(hours, minutes, seconds, milliseconds) {
  const totalMinutes = Number(hours || 0) * 60 + Number(minutes);
  const normalizedMilliseconds = String(milliseconds).padEnd(3, '0').slice(0, 3);

  return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${normalizedMilliseconds}`;
}

// Converts SRT/WebVTT cue start times into the LRC timestamps understood by
// lrc-file-parser. Cue identifiers and end times are intentionally ignored.
export function subtitleToLrc(content) {
  const lines = String(content || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const lyricLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].trim().match(cueStartPattern);
    if (!match) continue;

    const textLines = [];
    index += 1;
    while (index < lines.length && lines[index].trim() !== '') {
      textLines.push(lines[index].trim());
      index += 1;
    }

    const text = textLines.join(' ');
    if (text) {
      lyricLines.push(`[${formatLrcTimestamp(match[1], match[2], match[3], match[4])}] ${text}`);
    }
  }

  return lyricLines.join('\n');
}

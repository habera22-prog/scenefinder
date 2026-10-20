const components: Record<string, string[]> = {
  photo: ['photo'],
  drone: ['drone'],
  video: ['video'],
  photo_drone: ['photo', 'drone'],
  photo_video: ['photo', 'video'],
  drone_video: ['drone', 'video'],
  all: ['photo', 'drone', 'video'],
};

export function captureRequirements(code: string) {
  return components[code] ?? [code];
}

export function captureModesIncluding(code: string) {
  const required = captureRequirements(code);
  const matches = Object.keys(components).filter((candidate) =>
    required.every((part) => components[candidate].includes(part)),
  );
  return matches.length ? matches : [code];
}

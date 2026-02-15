export const APP_INFO = {
  name: "Carpool Betel",
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  buildDate: __APP_BUILD_DATE__,
};

export const formatBuildDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

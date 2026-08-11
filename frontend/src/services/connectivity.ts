let serverAvailable = true;

export const setServerAvailable = (value: boolean) => { serverAvailable = value; };
export const canWriteToServer = () => (typeof navigator === 'undefined' || navigator.onLine) && serverAvailable;

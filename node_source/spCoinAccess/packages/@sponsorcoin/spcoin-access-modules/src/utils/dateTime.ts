// @ts-nocheck
// File: /@sponsorcoin/spcoin-access-modules/utils/dateTime.js
const MONTH_ABBREVIATIONS = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
];
const pad2 = (value) => String(value).padStart(2, '0');
const formatMeridiem = (hours) => (hours >= 12 ? 'p.m.' : 'a.m.');
const formatHour12 = (hours) => {
    const normalized = hours % 12;
    return normalized === 0 ? 12 : normalized;
};
export const bigIntToDateTimeString = (_value) => {
    const milliSecs = Number(bigIntToDecMilliSecs(_value));
    const date = new Date(milliSecs);
    if (Number.isNaN(date.getTime()))
        return String(_value);
    const month = MONTH_ABBREVIATIONS[date.getMonth()] || 'UNK';
    const day = pad2(date.getDate());
    const year = date.getFullYear();
    const hour = formatHour12(date.getHours());
    const minute = pad2(date.getMinutes());
    const meridiem = formatMeridiem(date.getHours());
    return `${month}-${day}-${year}, ${hour}:${minute} ${meridiem}`;
};
export const getLocation = () => {
    const location = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return location;
};
export const bigIntToDecMilliSecs = (_value) => { return (0, bigIntToDecString)(_value) + "000"; };
export const bigIntToDecString = (_value) => { return (0, bigIntToString)(_value, 10); };
export const bigIntToHexString = (_value) => { return (0, bigIntToString)(_value, 16); };
export const bigIntToString = (_value, _base) => { return BigInt(_value).toString(_base); };
export const formatTimeSeconds = (timeInSeconds) => {
    const formattedTime = parseTimeSeconds(timeInSeconds);
    return formattedTime;
};
export const parseTimeSeconds = (timeInSeconds) => {
    // let timeInSeconds = 340047;
    let seconds = timeInSeconds;
    const days = Math.floor(timeInSeconds / 86400);
    seconds -= days * 86400;
    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    // let remaining = timeInSeconds - (days*24*60*60 + hours*60*60);
    const formattedTime = 'Days:' + days + ' Hours:' + hours + ' Minutes:' + minutes + ' Seconds:' + seconds;
    console.log("formattedTime = ", formattedTime);
    return formattedTime;
};
export const dateInSeconds = () => {
    const dateInMillisecs = Date.now();
    const dateInSeconds = Math.round(dateInMillisecs / 1000);
    return dateInSeconds;
};
export const dateInMilliseconds = () => {
    const dateInMillisecs = Date.now();
    return dateInMillisecs;
};

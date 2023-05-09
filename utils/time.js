const addLeadingZero = (num) => {
    return num < 10 ? `0${num}` : String(num)
}

const getCurrentTime = () => {
    const date = new Date();
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(num => addLeadingZero(num)).join(':')
    return time;
}

const getTimestamp = () => {
    return new Date().toLocaleDateString('en-NL')
}

module.exports = {
    getCurrentTime,
    getTimestamp
}
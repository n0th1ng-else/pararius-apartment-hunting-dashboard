const getLocationUrl = (zipCode, city) => {
    return `https://www.google.com/maps/place/${zipCode.replaceAll(" ","+")}+${city}`
}

module.exports = {
    getLocationUrl
}

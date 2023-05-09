const {ITEM_PICTURE, ITEM_TITLE, ITEM_AGENT, ITEM_SURFACE,
    ITEM_ROOMS, ITEM_INTERIOR, ITEM_STATUS, ITEM_PRICE,
    ITEM_SUBTITLE
} = require("./selectors");

const fetchPicture = ($, element) => {
    const pictureLine = $(ITEM_PICTURE, element);
    const html = pictureLine?.text() ?? '';
    const parts = html.split(' ')
    const src = parts.find(part => part.startsWith('src=')) || ''
    const urls = src.split('"');
    return urls.find(u => u.startsWith('http')) || ''
}

const fetchAptPath = ($, element) => {
    const firstLine = $(ITEM_TITLE, element)
    return firstLine.attr("href").trim()
}

const fetchAptUrl = ($, element) => {
    return `https://www.pararius.com${fetchAptPath($, element)}`
}

const fetchAptAgent = ($, element) => {
    const forthLine = $(ITEM_AGENT, element)
    const path = forthLine.attr("href").trim()
    const name = forthLine.text().replace(/\s\s+/g, ' ').trim()
    const link = `https://www.pararius.com${path}`
    return {name, link}
}

const fetchSurface = ($, element) => {
    const surface = $(ITEM_SURFACE, element)
    const val = surface.text().replace('m²', '').trim()
    const num = Number(val);
    if (!num || (isNaN(num))) {
        console.error(`The surface could not be converted, found: ${val}, expected number`)
        return 0;
    }
    return num
}

const fetchRooms = ($, element) => {
    const rooms = $(ITEM_ROOMS, element)
    const val = rooms.text().replace('room', '').replace('s', '').trim()
    const num = Number(val);
    if (!num || (isNaN(num))) {
        console.error(`The rooms could not be converted, found: ${val}, expected number`)
        return 0
    }
    return num
}

const fetchInterior = ($, element) => {
    const interior = $(ITEM_INTERIOR, element)
    return interior.text().trim()
}

const fetchStatus = ($, element) => {
    const status = $(ITEM_STATUS, element)
    return status.text().trim()
}

const fetchAptName = ($, element) => {
    const firstLine = $(ITEM_TITLE, element)
    return firstLine.text().replace(/\s\s+/g, ' ').trim()
}

const fetchAptPrice = ($, element) => {
    const thirdLine = $(ITEM_PRICE, element);
    const val = thirdLine.clone().children().remove().end().text().replace(/[€,]+/g, '').replace(/per month/g, '').trim()
    const num = Number(val);
    if (!num || (isNaN(num))) {
        console.error(`The price could not be converted, found: ${val}, expected number`)
        return 0
    }
    return num
}

const fetchAptAddress = ($, element) => {
    const secondLine = $(ITEM_SUBTITLE, element)
    const [left, right] = secondLine.text().trim().split('(')
    const [zip1, zip2, ...cityParts] = left.split(' ')
    const zipCode = [zip1, zip2].join(' ').trim()
    const city = cityParts.join(' ').trim()
    const neighborhood = right.replace(')', '').trim()
    return {
        zipCode,
        city,
        neighborhood
    }
}

const getId = (path = "") => {
    const trimmed = path.trim();
    const trailed = trimmed.endsWith("/") ? trimmed.slice(0, trimmed.length - 1) : trimmed;
    const sliced = trailed.startsWith("/") ? trailed.slice(1) : trailed;
    return sliced.replace(/\//g, '-')
}

module.exports = {
    fetchPicture,
    fetchAptPath,
    fetchAptUrl,
    fetchAptAgent,
    fetchSurface,
    fetchRooms,
    fetchInterior,
    fetchStatus,
    fetchAptName,
    fetchAptPrice,
    fetchAptAddress,
    getId
}
const fs = require('fs');
const content = fs.readFileSync('src/pages/LandingPage.jsx', 'utf8');

const openDiv = (content.match(/<div/g) || []).length;
const closeDiv = (content.match(/<\/div>/g) || []).length;
console.log(`Divs: Open: ${openDiv}, Close: ${closeDiv}`);

const openButton = (content.match(/<button/g) || []).length;
const closeButton = (content.match(/<\/button>/g) || []).length;
console.log(`Buttons: Open: ${openButton}, Close: ${closeButton}`);

const openSection = (content.match(/<section/g) || []).length;
const closeSection = (content.match(/<\/section>/g) || []).length;
console.log(`Sections: Open: ${openSection}, Close: ${closeSection}`);

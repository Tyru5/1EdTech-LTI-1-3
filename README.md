# LTI 1.3 Assignment Grading Services (AGS)

A library implementing the 1EdTechLTI 1.3 [Assignment Grading Services](https://www.imsglobal.org/spec/lti-ags/v2p0/) (AGS) Specification

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![MIT License][license-shield]][license-url]

<!-- TABLE OF CONTENTS -->
## Table of Contents
- [About the Project](#about-the-project)
  - [Installation](#installation)
  - [Usage](#usage)
- [License](#license)
- [Contact](#contact)

## Installation
```javascript
 npm install 1edtech-lti-1-3-ags
```

## Supported LTI Version
[LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3)

## General Overview
![Assignment and Grade Services Overview](assets/GradebookServicesOverview.png)
*Assignment and Grade Services Overview -- taken from the offical 1EdTech AGS Specification*

## Usage
The LTI 1.3 Core Specification won't be covered here, however, it would good to familiarize yourself with the [specification](https://www.imsglobal.org/spec/lti/v1p3)
before utilizing this package. It would give you a core understanding behind the design choices and implementation differences from LTI 1.1.

The same is true for the LTI Advantage Assignment Grading Services (AGS) specification. I highly advise and recommend becomming
familiar with the new [specficiation](https://www.imsglobal.org/spec/lti-ags/v2p0/). An official migration guide is provided by 1EdTech, which couuld be found [here](https://www.imsglobal.org/spec/lti/v1p3/migr#migrating-from-basic-outcome-to-assignment-and-grade-services-2-0).
It briefly discusses how to migration from the `Basic Outcome Service` to the new `Assignment Grading Services 2.0` (which is a part of the core LTI Advantage Services).

An important thing to note -- this library doesn't help you manage anything in relation to creating your public/private RSA keys. You will have to handle that on your own.
More information could be found in the offical [1EdTech Security Framework](https://www.imsglobal.org/spec/security/v1p0/).

```javascript
import AGS from '1edtech-lti-1-3-ags';

const ags = new AGS({
  issuer,
  clientId,
  deploymentId,
  rsaPrivateKey,
});

// So once the Assignment Grading Services (AGS) has been initialized and instantiated, it can now be used for `lineitem` CRUD operations, and grade-passback.
// For instance,  you can do something like this:
let createdLineitem = null;
try {
  createdLineitem = await ags.createLineitem();
} catch (error) {
  throw error(`Error in creating lineitem`, error); 
}
/**
 * This will return an object, with the necessary properties from the newly created lineitem. This will include the
 * lineitem `id`, and the assocaited metadata for the lineitem.
 * 
 * The `id` property is the url that will be used to later update, delete, post new socres, or getting the current results associated with that lineitem.
 */

// createdLineitem will have these properties:
{
  "id": "string",
  "startDateTime": "2023-08-28T02:37:32.679Z",
  "endDateTime": "2023-08-28T02:37:32.679Z",
  "scoreMaximum": 0,
  "label": "string",
  "tag": "string",
  "resourceId": "string",
  "resourceLinkId": "string"
}
.
.
.

// Posting back grade(s):
const gradePassback = await ags.postGrades();
```

<!-- LICENSE -->
## License
Distributed under the MIT License. See `LICENSE` for more information.

<!-- CONTACT -->
## Contact
Tyrus Malmstrom - [@TirustheVirus](https://twitter.com/TirustheVirus) - tyrusm@hotmail.com

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=flat-square
[license-url]: https://github.com/Tyru5/1EdTech-LTI-1-3/blob/main/LICENSE

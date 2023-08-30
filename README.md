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
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)
- [Contact](#contact)

## Installation
```zsh
pnpm install lti-1p3-ags
```

## Supported LTI Version
[LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3)

## General Overview
![Assignment and Grade Services Overview](assets/GradebookServicesOverview.png)
*Assignment and Grade Services Overview -- taken from the official 1EdTech AGS Specification*

## Supported Methods
```javascript
postScore();
createLineitem();
fetchAllLineitems();
fetchLineitem();
```

Other CRUD operations currently in progress.

## Usage
The LTI 1.3 Core Specification won't be covered here, however, it would be good to familiarize yourself with the [specification](https://www.imsglobal.org/spec/lti/v1p3)
before utilizing this package. It would give you a core understanding behind the design choices and implementation differences from LTI 1.1.

The same is true for the LTI Advantage Assignment Grading Services (AGS) specification. I highly advise and recommend becoming
familiar with the new [specificiation](https://www.imsglobal.org/spec/lti-ags/v2p0/). An official migration guide is provided by 1EdTech, which could be found [here](https://www.imsglobal.org/spec/lti/v1p3/migr#migrating-from-basic-outcome-to-assignment-and-grade-services-2-0).
It briefly discusses the migration from the `Basic Outcome Service` to the new `Assignment Grading Services 2.0` (which is a part of the core LTI Advantage Services).

An important thing to note -- this library doesn't help you manage anything in relation to creating your public/private RSA keys. You will have to handle that on your own.
More information could be found in the official [1EdTech Security Framework](https://www.imsglobal.org/spec/security/v1p0/).

```javascript
/**
 * Testing for the AGS npm package module.
 */
import AGS from 'lti-1p3-ags';
import fs from 'fs';

try {

  const ags = new AGS(
    issuer,
    clientId,
    deploymentId,
    oAuth2AccessEndpoint,
    keyId,
    fs.readFileSync('path/to/private-key.pem || string', 'utf-8'),
  );

  /**
   * Important! Need to invoke the `init()` method.
   */
  await ags.init();

  // From here, you can perform CRUD operatinos on lineitem(s), and review the Access Token that was generated:
  console.log(ags.accessToken);

  // If you pass no params, it will fetch all lineitems:
  const lineitems = await ags.fetchAllLineitems({
    lineitemsUrl: 'lineitems-urls-endpoint',
  });
  console.log(lineitems);
  /**
   * [
      {
        id: 'https://lorem ipsum',
        scoreMaximum: 2,
        label: 'user profile - enable captions',
        resourceLinkId: 'resource-link-id'
      },
      {
        id: 'https://lorem ipsum',
        scoreMaximum: 40,
        label: 'Taylor Swift - All Of The Girls You Loved Before (Audio)',
        resourceLinkId: 'resource-link-id'
      },
      {
        id: 'https://lorem ipsum',
        scoreMaximum: 40,
        label: 'Moving | Official Trailer | Hulu',
        resourceLinkId: 'resource-link-id'
      }
    ]
  */

  // If you pass `params`, it will fetch the lineitems based on off the params passed:
   const params = {
    resource_link_id: 'resource-link-id',
  };
  const lineitem = await ags.fetchAllLineitems({
    lineitemsUrl: 'lineitem-url-endpoint',
    params,
  });
  console.log(lineitem);
  /**
   * [
      {
        id: 'lorem ipsum',
        scoreMaximum: 2,
        label: 'user profile - enable captions',
        resourceLinkId: 'resource-link-id'
      }
    ]
  */

} catch (error) {
  console.log(error);  
}
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

/*
 * This is a JavaScript Scratchpad.
 *
 * Enter some JavaScript, then Right Click or choose from the Execute Menu:
 * 1. Run to evaluate the selected text (Ctrl+R),
 * 2. Inspect to bring up an Object Inspector on the result (Ctrl+I), or,
 * 3. Display to insert the result in a comment after the selection. (Ctrl+L)
 */
(function () {
  'use strict';
  
    function Promise() {
    this.callbacks = [];
    this.state = 'new';
    this.result = undefined;
  }
  
  Promise.prototype = {
    then: function (fn) {
      ensure(fn != null);
      ensure(fn instanceof Function);
      switch (this.state) {
        case 'new':
          this.callbacks.push(fn);
          return this;
          break;
        case 'resolved':
          fn.call(undefined, result);
          return this;
        default:
          throw new Error('Unknown promise state.');
      }
    },
    resolve : function (result) {
      this.state = 'resolved';
      this.result = result;
      this.callbacks.forEach(function (callback) {
        callback.call(undefined, result);
      });
      this.callbacks = null;
    }
  }
  
  Promise.all = function (promises) {
    ensure(Array.isArray(promises));
    if (promises.length === 0) {
      let result = new Promise();
      result.resolve([]);
    }
    let results = [];
    let finishFlags = [];
    let resultGlogalPromise = new Promise();
    promises.forEach(function (promise, index){
      finishFlags[index] = false;
      promise.then(function (result) {
        results[index] = result;
        finishFlags[index] = true;
        let allFinished = finishFlags.every(function (finishFlag) {
          return finishFlag;
        });
        if (allFinished) {
          resultGlogalPromise.resolve(results);
        }
      });
    });
    return resultGlogalPromise;
  }
  
  
  console.dir(getLinksToTryToLoad());
  getImageUrls();
  
  function showImages(imageUrls) {
    console.log('showImages', imageUrls);
    document.body.innerHTML = "";
    imageUrls.map(createImageTag)
      .forEach(function (imageTag) {
        let divElement = document.createElement('div');
        divElement.appendChild(imageTag);
        document.body.appendChild(divElement);
      });
  }
  
  function getImageUrls() {
    let pageUrls = getLinksToTryToLoad();
    let imageUrlPromises = pageUrls.map(getImageUrl);
    let globalPromise = Promise.all(imageUrlPromises);
    globalPromise.then(showImages);
  }
  
  function createImageTag(url) {
    let imgElement = document.createElement('img');
    imgElement.setAttribute('src', url.href);
    return imgElement;
  }
  
  /**
   * url of page containing image -> promise of url of image
   */
  function getImageUrl(url) {
    let result = new Promise();
    let iframe = createIframe(url, function(){
      let imageUrl = extractImage(iframe);
      document.body.removeChild(iframe);
      result.resolve(imageUrl);
    });
    return result;
  }
  
  function extractImage(iframe) {
      let images = iframe.contentDocument.images;
      let bigEnoughImages = Array.prototype.filter.call(images, enoughSizePredicate);
      if (bigEnoughImages.length === 0) {
        return null;
      }
      let biggestImage = bigEnoughImages.reduce(function (sum, image) {
        let imageSize = image.naturalWidth * image.naturalHeight;
        if (sum.image === undefined || sum.size < imageSize) {
          sum.image = image;
          sum.size = imageSize;
        }
        return sum;
      }, {}).image;
      let imageUrl = new URL(biggestImage.src);
      return imageUrl;
  
    function enoughSizePredicate(image) {
      let result = image.naturalWidth > 25 && image.naturalHeight > 25;
      console.log('predicate', image, result);
      return result;
    }
  }
  

  function createIframe(url, loadHandler) {
    var iframeElement = document.createElement('iframe');
    iframeElement.setAttribute('style', 'visibility: none');
    iframeElement.addEventListener('load', function (event){
      console.log('iframe loaded',event);
    });
    iframeElement.addEventListener('load', loadHandler);
    iframeElement.setAttribute('src', url.href);
    document.body.appendChild(iframeElement);
    return iframeElement;
  }
  
  function getLinksToTryToLoad() {
    let relevantUrls = getRelevantLinks();
    let mapOfBuckets = groupByPrefixOfLastSegment(relevantUrls);
    let arrayOfBuckets = values(mapOfBuckets);
    let enoughSizedBuckets = arrayOfBuckets.filter(minSizeBucketPredicate);
    let similarLastSegmentBuckets = enoughSizedBuckets.filter(lastSegmentDiffersInNumbersOnlyPredicate);
    let urlsToLoad = similarLastSegmentBuckets.reduce(function (previousResult, currentValue) {
      return previousResult.concat(currentValue)
      .map(recordToUrl);
    }, []);
    return urlsToLoad;
    
    function recordToUrl(record) {
      return record.url;
    }
  }
  
  /**
   * map -> values
   */
  function values(map) {
    ensure(typeof map === 'object');
    return Object.keys(map).map(function (key) {
      return map[key];
    });
  }
  
  /**
   * strLinks {Array} of URL objects
   * return {Object} map: allButLastSegmentPath (String) -> Array of objects with keys `lastSegment` and `url`
   */
  function groupByPrefixOfLastSegment(urlLinks) {
    console.log('groupByPrefixOfLastSegment', urlLinks);
    var groupsMap = {}; // all-but-last-path-segments -> [{lastSegment: lastSegment, url: original_url }]
    urlLinks.forEach(function (url) {
      var splitRe = /(.*)\/([^/]*)/;
      let pathParts = splitRe.exec(url.pathname);
      let beforeLastSegment = pathParts[1];
      let lastSegment = pathParts[2];
      let record = {
        lastSegment: lastSegment,
        url: url
      };
      getGroupBucket(beforeLastSegment).push(record);
    });
    return groupsMap;

    
    /**
     * bucketKey {String}
     */
    function getGroupBucket(bucketKey) {
      let originalValue = groupsMap[bucketKey];
      if (Array.isArray(originalValue)) {
        return originalValue;
      }
      let result = [];
      groupsMap[bucketKey] = result;
      return result;
    }
  }
    
      
    function minSizeBucketPredicate (records) {
      return records.length >= 4;
    }
    
    function lastSegmentDiffersInNumbersOnlyPredicate(records) {
      console.log('records', records);
      let re = /[^0-9]+/;
      let firstNonNumbers = records[0].lastSegment.match(re);
      let result = records.every(function (record) {
        let elementNonNumbers = record.lastSegment.match(re);
        let result = arrayEquals(firstNonNumbers, elementNonNumbers);
        return result;
      });
      return result;
    }
    
    /**
     * a1 {Array} to compare
     * a2 {Array} to compare
     * return {Boolean} true if both a1 and a2 are arrays and they contain same elements or both parameters are null
     *   false otherwise
     */
    function arrayEquals (a1, a2) {
      console.log('arrayEquals',a1,a2);
      ensure(Array.isArray(a1) || a1 === null);
      ensure(Array.isArray(a2) || a2 === null);
      if (a1 === null || a2 === null) {
        return a1 === a2;
      }
      let result = a1.map(function (value, index) {
        return value === a2[index];
      }).every(function (elem) {return elem;});
      return result;
    }
    
    function ensure (condition) {
      if (!condition) {
        throw new Error();
      }
    }
  
  /**
   * return {Array} of URL objects - links of the same domain and protocol, only http and https protocols
   */
  function getRelevantLinks() {
    let allUrl = Array.prototype.map.call(document.links, stringToUrl);
    let sameOriginUrl = allUrl.filter(sameOriginUrlPredicate);
    let noRootUrl = sameOriginUrl.filter(removeLinksToRootPredicate);
    let httpAndHttpsOnly = noRootUrl.filter(httpAndHttpsOnlyPredicate);
    let noDuplicates = dedupUrlArray(httpAndHttpsOnly);
    return noDuplicates;
  }
  
  /**
   * urls {Array} of urls
   * return {Array} of urls that does not contain duplicates
   */
  function dedupUrlArray(urls) {
    let map = {} // string_url -> url
    urls.forEach (function(url) {
      map[url.href] = url;
    });
    let values = Object.keys(map).map(function (key) {
      return map[key];
    });
    return values;
  }
  
  function httpAndHttpsOnlyPredicate(url) {
    let result = url.protocol === "http:" || url.protocol === "https:";
    return result;
  }
  
  function stringToUrl(str) {
    return new URL(str);  
  }
    
  function sameOriginUrlPredicate(url) {
    let documentUrl = new URL(document.URL);
    let result = documentUrl.origin === url.origin;
    return result;
  }
  
  function removeLinksToRootPredicate(url) {
    let hrefWithoutTrailingShashes = removeTrailingSlashes(url.href);
    let isRoot = hrefWithoutTrailingShashes === url.origin;
    return !isRoot;
  }
  
  function removeTrailingSlashes(str) {
    requireType(str, 'string');
    let re = /(.*[^/])\/*$/;
    let result = re.exec(str)[1];
    return str;
  }
  
  function urlToString(url) {
    return url.href;
  }
  
  function requireType(object, typeName) {
    let actualType = typeof object;
    if (actualType !== typeName) {
      throw new TypeError('Required type "' + typeName + '", actual type "' + actualType + '"');
    }
  }
}) ();

export interface DeviceFingerprint {
  'User-Agent': string;
  'sec-ch-ua'?: string;
  'sec-ch-ua-mobile'?: string;
  'sec-ch-ua-platform'?: string;
  'Accept-Language'?: string;
  'Accept'?: string;
  'Upgrade-Insecure-Requests'?: string;
  'Sec-Fetch-Site'?: string;
  'Sec-Fetch-Mode'?: string;
  'Sec-Fetch-User'?: string;
  'Sec-Fetch-Dest'?: string;
  [key: string]: string | undefined;
}

// 辅助函数：生成范围内的随机整数
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 辅助函数：从数组中随机选择
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 辅助函数：随机生成语言权重
function generateAcceptLanguage(): string {
  const primary = randomChoice(['zh-CN', 'zh-CN', 'zh-CN', 'en-US']); // 偏好中文
  if (primary === 'zh-CN') {
    return 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6';
  } else {
    return 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7';
  }
}

// 辅助函数：Chrome 系的通用 Headers
function getChromeHeaders() {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document'
  };
}

// 辅助函数：Safari 系的通用 Headers
function getSafariHeaders() {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document'
  };
}

// 动态生成 Chrome 版本号 (2025年12月标准: 140-143)
function generateChromeVersion() {
  const major = randomInt(140, 143);
  const build = randomInt(7000, 7500); 
  const patch = randomInt(0, 200);
  return {
    major: major.toString(),
    full: `${major}.0.${build}.${patch}`
  };
}

// 动态生成 Edge 版本号 (2025年12月标准: 140-143)
function generateEdgeVersion() {
  const major = randomInt(140, 143);
  const build = randomInt(3500, 3700);
  const patch = randomInt(0, 100);
  return {
    major: major.toString(),
    full: `${major}.0.${build}.${patch}`
  };
}

// 生成 Windows 指纹
function generateWindowsFingerprint(): DeviceFingerprint {
  const isEdge = Math.random() > 0.3; 
  const version = isEdge ? generateEdgeVersion() : generateChromeVersion();
  
  // 品牌标识
  // Chrome: "Google Chrome";v="143", "Chromium";v="143", "Not=A?Brand";v="24"
  // Edge: "Microsoft Edge";v="143", "Chromium";v="143", "Not=A?Brand";v="24"
  const brand = isEdge ? '"Microsoft Edge"' : '"Google Chrome"';
  const brandShort = isEdge 
    ? `"Not=A?Brand";v="24", "Chromium";v="${version.major}", "Microsoft Edge";v="${version.major}"` 
    : `"Not=A?Brand";v="24", "Chromium";v="${version.major}", "Google Chrome";v="${version.major}"`;

  let ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.full} Safari/537.36`;
  if (isEdge) {
    ua += ` Edg/${version.full}`;
  }

  return {
    ...getChromeHeaders(),
    'User-Agent': ua,
    'sec-ch-ua': brandShort,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Accept-Language': generateAcceptLanguage()
  };
}

// 生成 macOS 指纹
function generateMacFingerprint(): DeviceFingerprint {
  // macOS 14/15/16
  const macVersions = ['14_7', '15_1', '15_2', '16_0'];
  const osVer = randomChoice(macVersions);
  
  const isSafari = Math.random() > 0.6; 
  
  if (isSafari) {
    // Safari 2025: Version 26.0 (Year+1 scheme) or 19.x
    // Tavily search suggested Version/26.0
    const safariVerMajor = 26;
    const safariVerMinor = 0;
    const webKitVer = `605.1.15`;
    
    return {
      ...getSafariHeaders(),
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVer}) AppleWebKit/${webKitVer} (KHTML, like Gecko) Version/${safariVerMajor}.${safariVerMinor} Safari/${webKitVer}`,
      'sec-ch-ua': undefined,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    };
  } else {
    const version = generateChromeVersion();
    const brandShort = `"Not=A?Brand";v="24", "Chromium";v="${version.major}", "Google Chrome";v="${version.major}"`;
    
    return {
      ...getChromeHeaders(),
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.full} Safari/537.36`,
      'sec-ch-ua': brandShort,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Accept-Language': generateAcceptLanguage()
    };
  }
}

// 生成 Android 指纹 (Reduced UA Standard)
function generateAndroidFingerprint(): DeviceFingerprint {
  // Android User-Agent Reduction:
  // Mobile: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36
  
  const version = generateChromeVersion();
  const brandShort = `"Not=A?Brand";v="24", "Chromium";v="${version.major}", "Google Chrome";v="${version.major}"`;

  return {
    ...getChromeHeaders(),
    'User-Agent': `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.full} Mobile Safari/537.36`,
    'sec-ch-ua': brandShort,
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'Accept-Language': generateAcceptLanguage()
  };
}

// 生成 iOS 指纹
function generateIOSFingerprint(): DeviceFingerprint {
  // iOS 18.x
  const iosMajor = 18;
  const iosMinor = randomInt(5, 7);
  const iosPatch = randomInt(0, 3);
  const osString = `${iosMajor}_${iosMinor}_${iosPatch}`;
  
  // Safari Version 26.0
  const safariVer = '26.0';
  
  return {
    ...getSafariHeaders(),
    'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS ${osString} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${safariVer} Mobile/15E148 Safari/604.1`,
    'sec-ch-ua': undefined,
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
    'Accept-Language': 'zh-CN,zh;q=0.9'
  };
}

export function getRandomFingerprint(): DeviceFingerprint {
  const rand = Math.random();
  if (rand < 0.35) {
    return generateWindowsFingerprint();
  } else if (rand < 0.55) {
    return generateMacFingerprint();
  } else if (rand < 0.8) {
    return generateAndroidFingerprint();
  } else {
    return generateIOSFingerprint();
  }
}
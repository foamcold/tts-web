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
  // TLS Specifics (Node.js TLS options)
  __ciphers?: string;
  __ecdhCurve?: string;
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

// 辅助函数：随机打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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

// Chrome Cipher Suites (Common)
const CHROME_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-CHACHA20-POLY1305',
  'ECDHE-RSA-CHACHA20-POLY1305',
  'ECDHE-RSA-AES128-SHA',
  'ECDHE-RSA-AES256-SHA',
  'AES128-GCM-SHA256',
  'AES256-GCM-SHA384'
];

// Safari Cipher Suites (Common)
const SAFARI_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-CHACHA20-POLY1305',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-RSA-CHACHA20-POLY1305',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-SHA384',
  'ECDHE-RSA-AES256-SHA384',
  'ECDHE-ECDSA-AES128-SHA256',
  'ECDHE-RSA-AES128-SHA256'
];

// 辅助函数：生成 Chrome 风格的 TLS 选项
function getChromeTLS() {
  // Chrome 倾向于保持顺序，但为了 JA3 随机化，我们微调顺序
  // 保持前3个 (TLS 1.3) 不变，随机打乱后面的
  const tls13 = CHROME_CIPHERS.slice(0, 3);
  const others = shuffleArray(CHROME_CIPHERS.slice(3));
  return {
    __ciphers: [...tls13, ...others].join(':'),
    __ecdhCurve: 'X25519:P-256:P-384' // Chrome order
  };
}

// 辅助函数：生成 Safari 风格的 TLS 选项
function getSafariTLS() {
  const tls13 = SAFARI_CIPHERS.slice(0, 3);
  const others = shuffleArray(SAFARI_CIPHERS.slice(3));
  return {
    __ciphers: [...tls13, ...others].join(':'),
    __ecdhCurve: 'X25519:P-256:P-384:P-521' // Safari often includes P-521
  };
}

// 辅助函数：Chrome 系的通用 Headers
function getChromeHeaders() {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    ...getChromeTLS()
  };
}

// 辅助函数：Safari 系的通用 Headers
function getSafariHeaders() {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document',
    ...getSafariTLS()
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
  const macVersions = ['14_7', '15_1', '15_2', '16_0'];
  const osVer = randomChoice(macVersions);
  
  const isSafari = Math.random() > 0.6; 
  
  if (isSafari) {
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
  const iosMajor = 18;
  const iosMinor = randomInt(5, 7);
  const iosPatch = randomInt(0, 3);
  const osString = `${iosMajor}_${iosMinor}_${iosPatch}`;
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
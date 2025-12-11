export interface DeviceFingerprint {
  'User-Agent': string;
  'sec-ch-ua'?: string;
  'sec-ch-ua-mobile'?: string;
  'sec-ch-ua-platform'?: string;
  'Accept-Language'?: string;
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

// 动态生成 Chrome 版本号 (major.0.build.patch)
// 比如 120 - 124
function generateChromeVersion() {
  const major = randomInt(120, 124);
  const build = randomInt(6000, 6400); // 假设的 build 范围
  const patch = randomInt(0, 200);
  return {
    major: major.toString(),
    full: `${major}.0.${build}.${patch}`
  };
}

// 动态生成 Edge 版本号
function generateEdgeVersion() {
  const major = randomInt(120, 124);
  const build = randomInt(2000, 2500);
  const patch = randomInt(0, 100);
  return {
    major: major.toString(),
    full: `${major}.0.${build}.${patch}`
  };
}

// 生成 Windows 指纹
function generateWindowsFingerprint(): DeviceFingerprint {
  const isWin11 = Math.random() > 0.5;
  const platformVersion = isWin11 ? '15.0.0' : '10.0.0'; // Windows 11 platform version usually reports higher in some contexts, but 'Windows' platform hint is generic.
  // Actually, sec-ch-ua-platform-version distinguishes Win 10 vs 11 better, but let's stick to basics first.
  // UA string for Windows 11 often still says "Windows NT 10.0".
  
  const isEdge = Math.random() > 0.3; // 70% Chrome, 30% Edge
  const version = isEdge ? generateEdgeVersion() : generateChromeVersion();
  
  const brand = isEdge ? '"Microsoft Edge"' : '"Google Chrome"';
  const brandShort = isEdge ? '"Not_A Brand";v="8", "Chromium";v="' + version.major + '", "Microsoft Edge";v="' + version.major + '"' 
                         : '"Not_A Brand";v="8", "Chromium";v="' + version.major + '", "Google Chrome";v="' + version.major + '"';

  let ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.full} Safari/537.36`;
  if (isEdge) {
    ua += ` Edg/${version.full}`;
  }

  return {
    'User-Agent': ua,
    'sec-ch-ua': brandShort,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6'
  };
}

// 生成 macOS 指纹
function generateMacFingerprint(): DeviceFingerprint {
  // macOS 版本: 10_15_7, 11_x, 12_x, 13_x, 14_x
  const macVersions = ['10_15_7', '11_6', '12_6', '13_5', '14_1', '14_2'];
  const osVer = randomChoice(macVersions);
  
  const isSafari = Math.random() > 0.6; // 40% Safari, 60% Chrome
  
  if (isSafari) {
    // Safari 版本
    const safariVerMajor = randomInt(15, 17);
    const safariVerMinor = randomInt(0, 4);
    const webKitVer = `605.1.15`;
    
    return {
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVer}) AppleWebKit/${webKitVer} (KHTML, like Gecko) Version/${safariVerMajor}.${safariVerMinor} Safari/${webKitVer}`,
      'sec-ch-ua': undefined, // Safari 通常不发送这些
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    };
  } else {
    // Chrome on Mac
    const version = generateChromeVersion();
    const brandShort = '"Not_A Brand";v="8", "Chromium";v="' + version.major + '", "Google Chrome";v="' + version.major + '"';
    
    return {
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.full} Safari/537.36`,
      'sec-ch-ua': brandShort,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };
  }
}

// 生成 Android 指纹
function generateAndroidFingerprint(): DeviceFingerprint {
  const androidVer = randomInt(10, 14);
  const models = ['SM-G991B', 'Pixel 6', 'Pixel 7', 'M2102K1G', 'SM-S901B', '2201117TY'];
  const model = randomChoice(models);
  const version = generateChromeVersion();
  
  const brandShort = '"Not_A Brand";v="8", "Chromium";v="' + version.major + '", "Google Chrome";v="' + version.major + '"';

  return {
    'User-Agent': `Mozilla/5.0 (Linux; Android ${androidVer}; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.full} Mobile Safari/537.36`,
    'sec-ch-ua': brandShort,
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
  };
}

// 生成 iOS 指纹
function generateIOSFingerprint(): DeviceFingerprint {
  const iosMajor = randomInt(15, 17);
  const iosMinor = randomInt(0, 4);
  const osString = `${iosMajor}_${iosMinor}`;
  
  // iPhone Models could be implicitly handled by OS version or generic "iPhone"
  // UA: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1
  
  return {
    'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS ${osString} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${iosMajor}.${iosMinor} Mobile/15E148 Safari/604.1`,
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
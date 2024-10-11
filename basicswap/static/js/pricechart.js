// Config
const config = {
  apiKeys: getAPIKeys(),
  coins: [
    { symbol: 'BTC', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'XMR', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'PART', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'PIVX', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'FIRO', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'DASH', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'LTC', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'DOGE', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'ETH', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'DCR', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'ZANO', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 },
    { symbol: 'WOW', usesCryptoCompare: false, usesCoinGecko: true, historicalDays: 30 },
    { symbol: 'BCH', usesCryptoCompare: true, usesCoinGecko: false, historicalDays: 30 }
  ],
  apiEndpoints: {
    cryptoCompare: 'https://min-api.cryptocompare.com/data/pricemultifull',
    coinGecko: 'https://api.coingecko.com/api/v3/coins',
    cryptoCompareHistorical: 'https://min-api.cryptocompare.com/data/v2/histoday'
  },
  chartColors: {
    default: {
      lineColor: 'rgba(77, 132, 240, 1)',
      backgroundColor: 'rgba(77, 132, 240, 0.1)'
    }
  },
  showVolume: false,
  specialCoins: [''],
  resolutions: {
    month: { days: 30, interval: 'daily' },
    week: { days: 7, interval: 'daily' },
    day: { days: 1, interval: 'hourly' }
  },
  currentResolution: 'month'
};

// Utils
const utils = {
  formatNumber: (number, decimals = 2) => 
    number.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  
  formatDate: (timestamp, resolution) => {
    const date = new Date(timestamp);
    const options = {
      day: { hour: '2-digit', minute: '2-digit', hour12: true },
      week: { month: 'short', day: 'numeric' },
      month: { year: 'numeric', month: 'short', day: 'numeric' }
    };
    return date.toLocaleString('en-US', { ...options[resolution], timeZone: 'UTC' });
  },

  debounce: (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
};

// Error
class AppError extends Error {
  constructor(message, type = 'AppError') {
    super(message);
    this.name = type;
  }
}

// Log
const logger = {
  log: (message) => console.log(`[AppLog] ${new Date().toISOString()}: ${message}`),
  warn: (message) => console.warn(`[AppWarn] ${new Date().toISOString()}: ${message}`),
  error: (message) => console.error(`[AppError] ${new Date().toISOString()}: ${message}`)
};

// API
const api = {
  makePostRequest: (url, headers = {}) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/json/readurl');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 30000;
      xhr.ontimeout = () => reject(new AppError('Request timed out'));
      xhr.onload = () => {
        logger.log(`Response for ${url}:`, xhr.responseText);
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.Error) {
              logger.error(`API Error for ${url}:`, response.Error);
              reject(new AppError(response.Error, 'APIError'));
            } else {
              resolve(response);
            }
          } catch (error) {
            logger.error(`Invalid JSON response for ${url}:`, xhr.responseText);
            reject(new AppError(`Invalid JSON response: ${error.message}`, 'ParseError'));
          }
        } else {
          logger.error(`HTTP Error for ${url}: ${xhr.status} ${xhr.statusText}`);
          reject(new AppError(`HTTP Error: ${xhr.status} ${xhr.statusText}`, 'HTTPError'));
        }
      };
      xhr.onerror = () => reject(new AppError('Network error occurred', 'NetworkError'));
      xhr.send(JSON.stringify({
        url: url,
        headers: headers
      }));
    });
  },
  
  fetchCryptoCompareDataXHR: (coin) => {
    const url = `${config.apiEndpoints.cryptoCompare}?fsyms=${coin}&tsyms=USD,BTC&api_key=${config.apiKeys.cryptoCompare}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
    return api.makePostRequest(url, headers).catch(error => ({
      error: error.message
    }));
  },
  
  fetchCoinGeckoDataXHR: (coin) => {
    const coinConfig = config.coins.find(c => c.symbol === coin);
    if (!coinConfig) {
      logger.error(`No configuration found for coin: ${coin}`);
      return Promise.reject(new AppError(`No configuration found for coin: ${coin}`));
    }
    let coinId;
    switch (coin) {
      case 'WOW':
        coinId = 'wownero';
        break;
      default:
        coinId = coin.toLowerCase();
    }
    const url = `${config.apiEndpoints.coinGecko}/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    logger.log(`Fetching data for ${coin} from CoinGecko: ${url}`);
    return api.makePostRequest(url)
      .then(data => {
        logger.log(`Raw CoinGecko data for ${coin}:`, data);
        if (!data.market_data || !data.market_data.current_price) {
          throw new AppError(`Invalid data structure received for ${coin}`);
        }
        return data;
      })
      .catch(error => {
        logger.error(`Error fetching CoinGecko data for ${coin}:`, error);
        return {
          error: error.message
        };
      });
  },
  
fetchHistoricalDataXHR: (coinSymbol) => {
  const coin = config.coins.find(c => c.symbol === coinSymbol);
  if (!coin) {
    logger.error(`No configuration found for coin: ${coinSymbol}`);
    return Promise.reject(new AppError(`No configuration found for coin: ${coinSymbol}`));
  }

  let url;
  const resolutionConfig = config.resolutions[config.currentResolution];
  
  if (coin.usesCoinGecko) {
    let coinId;
    switch (coinSymbol) {
      case 'ZANO':
        coinId = 'zano';
        break;
      case 'WOW':
        coinId = 'wownero';
        break;
      default:
        coinId = coinSymbol.toLowerCase();
    }

    url = `${config.apiEndpoints.coinGecko}/${coinId}/market_chart?vs_currency=usd&days=2`;
  } else {

    if (config.currentResolution === 'day') {
      url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=${coinSymbol}&tsym=USD&limit=24&api_key=${config.apiKeys.cryptoCompare}`;
    } else if (config.currentResolution === 'week') {
      url = `${config.apiEndpoints.cryptoCompareHistorical}?fsym=${coinSymbol}&tsym=USD&limit=7&aggregate=24&api_key=${config.apiKeys.cryptoCompare}`;
    } else {
      url = `${config.apiEndpoints.cryptoCompareHistorical}?fsym=${coinSymbol}&tsym=USD&limit=30&aggregate=24&api_key=${config.apiKeys.cryptoCompare}`;
    }
  }

  logger.log(`Fetching historical data for ${coinSymbol}:`, url);

  return api.makePostRequest(url)
    .then(response => {
      logger.log(`Received historical data for ${coinSymbol}:`, JSON.stringify(response, null, 2));
      return response;
    })
    .catch(error => {
      logger.error(`Error fetching historical data for ${coinSymbol}:`, error);
      throw error;
    });
},

};

// Cache
const cache = {
  ttl: 15 * 60 * 1000,
  set: (key, value, customTtl = null) => {
    const item = {
      value: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + (customTtl || cache.ttl)
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  get: (key) => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    try {
      const item = JSON.parse(itemStr);
      const now = Date.now();
      if (now < item.expiresAt) {
        return {
          value: item.value,
          remainingTime: item.expiresAt - now
        };
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      logger.error('Error parsing cache item:', e);
      localStorage.removeItem(key);
    }
    return null;
  },
  isValid: (key) => {
    return cache.get(key) !== null;
  },
  clear: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('coinData_') || key.startsWith('chartData_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// UI
const ui = {
  displayCoinData: (coin, data) => {
    const coinConfig = config.coins.find(c => c.symbol === coin);
    let priceUSD, priceBTC, priceChange1d, volume24h;
    const updateUI = (isError = false) => {
      const priceUsdElement = document.querySelector(`#${coin.toLowerCase()}-price-usd`);
      const volumeDiv = document.querySelector(`#${coin.toLowerCase()}-volume-div`);
      const volumeElement = document.querySelector(`#${coin.toLowerCase()}-volume-24h`);
      const btcPriceDiv = document.querySelector(`#${coin.toLowerCase()}-btc-price-div`);
      const priceBtcElement = document.querySelector(`#${coin.toLowerCase()}-price-btc`);
      if (priceUsdElement) {
        priceUsdElement.textContent = isError ? 'N/A' : `$ ${ui.formatPrice(coin, priceUSD)}`;
      }
      if (volumeDiv && volumeElement) {
        volumeElement.textContent = isError ? 'N/A' : `${utils.formatNumber(volume24h, 0)} USD`;
        volumeDiv.style.display = volumeToggle.isVisible ? 'flex' : 'none';
      }
      if (btcPriceDiv && priceBtcElement && coin !== 'BTC') {
        priceBtcElement.textContent = isError ? 'N/A' : `${priceBTC.toFixed(8)} BTC`;
        btcPriceDiv.style.display = 'flex';
      }
      ui.updatePriceChangeContainer(coin, isError ? null : priceChange1d);
    };
    try {
      if (data.error) {
        throw new Error(data.error);
      }
      if (coinConfig.usesCoinGecko) {
        if (!data.market_data) {
          throw new Error(`Invalid CoinGecko data structure for ${coin}`);
        }
        priceUSD = data.market_data.current_price.usd;
        priceBTC = data.market_data.current_price.btc;
        priceChange1d = data.market_data.price_change_percentage_24h;
        volume24h = data.market_data.total_volume.usd;
      } else if (coinConfig.usesCryptoCompare) {
        if (!data.RAW || !data.RAW[coin] || !data.RAW[coin].USD) {
          throw new Error(`Invalid CryptoCompare data structure for ${coin}`);
        }
        priceUSD = data.RAW[coin].USD.PRICE;
        priceBTC = data.RAW[coin].BTC.PRICE;
        priceChange1d = data.RAW[coin].USD.CHANGEPCT24HOUR;
        volume24h = data.RAW[coin].USD.TOTALVOLUME24HTO;
      }
      if (isNaN(priceUSD) || isNaN(priceBTC) || isNaN(volume24h)) {
        throw new Error(`Invalid numeric values in data for ${coin}`);
      }
      updateUI(false);
    } catch (error) {
      logger.error(`Error displaying data for ${coin}:`, error.message);
      updateUI(true);
    }
  },
  
  showLoader: () => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.classList.remove('hidden');
    }
  },
  
hideLoader: () => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('hidden');
    }
  },
  
  showCoinLoader: (coinSymbol) => {
    const loader = document.getElementById(`${coinSymbol.toLowerCase()}-loader`);
    if (loader) {
      loader.classList.remove('hidden');
    }
  },
  
  hideCoinLoader: (coinSymbol) => {
    const loader = document.getElementById(`${coinSymbol.toLowerCase()}-loader`);
    if (loader) {
      loader.classList.add('hidden');
    }
  },
  
  updateCacheStatus: (isCached) => {
    const cacheStatusElement = document.getElementById('cache-status');
    if (cacheStatusElement) {
      cacheStatusElement.textContent = isCached ? 'Cached' : 'Live';
      cacheStatusElement.classList.toggle('text-green-500', isCached);
      cacheStatusElement.classList.toggle('text-blue-500', !isCached);
    }
  },
  
  updateLoadTimeAndCache: (loadTime, cachedData) => {
    const loadTimeElement = document.getElementById('load-time');
    const cacheStatusElement = document.getElementById('cache-status');
    
    if (loadTimeElement) {
      loadTimeElement.textContent = `Load time: ${loadTime}ms`;
    }
    
    if (cacheStatusElement) {
      if (cachedData && cachedData.remainingTime) {
        const remainingMinutes = Math.ceil(cachedData.remainingTime / 60000);
        cacheStatusElement.textContent = `Cached: ${remainingMinutes} min left`;
        cacheStatusElement.classList.add('text-green-500');
        cacheStatusElement.classList.remove('text-blue-500');
      } else {
        cacheStatusElement.textContent = 'Live';
        cacheStatusElement.classList.add('text-blue-500');
        cacheStatusElement.classList.remove('text-green-500');
      }
    }

    ui.updateLastRefreshedTime();
  },
  
  updatePriceChangeContainer: (coin, priceChange) => {
    const container = document.querySelector(`#${coin.toLowerCase()}-price-change-container`);
    if (container) {
      container.innerHTML = priceChange !== null ?
        (priceChange >= 0 ? ui.positivePriceChangeHTML(priceChange) : ui.negativePriceChangeHTML(priceChange)) :
        'N/A';
    }
  },
  
  updateLastRefreshedTime: () => {
    const lastRefreshedElement = document.getElementById('last-refreshed-time');
    if (lastRefreshedElement && app.lastRefreshedTime) {
      const formattedTime = app.lastRefreshedTime.toLocaleTimeString();
      lastRefreshedElement.textContent = `Last Refreshed: ${formattedTime}`;
    }
  },
  
  positivePriceChangeHTML: (value) => `
    <div class="flex flex-wrap items-center py-px px-1 border border-green-500 rounded-full">
      <svg class="mr-0.5" width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.16667 0.916748C7.75245 0.916748 7.41667 1.25253 7.41667 1.66675C7.41667 2.08096 7.75245 2.41675 8.16667 2.41675V0.916748ZM13.5 1.66675H14.25C14.25 1.25253 13.9142 0.916748 13.5 0.916748V1.66675ZM12.75 7.00008C12.75 7.41429 13.0858 7.75008 13.5 7.75008C13.9142 7.75008 14.25 7.41429 14.25 7.00008H12.75ZM0.96967 7.80308C0.676777 8.09598 0.676777 8.57085 0.96967 8.86374C1.26256 9.15664 1.73744 9.15664 2.03033 8.86374L0.96967 7.80308ZM5.5 4.33341L6.03033 3.80308C5.73744 3.51019 5.26256 3.51019 4.96967 3.80308L5.5 4.33341ZM8.16667 7.00008L7.63634 7.53041C7.92923 7.8233 8.4041 7.8233 8.697 7.53041L8.16667 7.00008ZM8.16667 2.41675H13.5V0.916748H8.16667V2.41675ZM12.75 1.66675V7.00008H14.25V1.66675H12.75ZM2.03033 8.86374L6.03033 4.86374L4.96967 3.80308L0.96967 7.80308L2.03033 8.86374ZM4.96967 4.86374L7.63634 7.53041L8.697 6.46975L6.03033 3.80308L4.96967 4.86374ZM8.697 7.53041L14.0303 2.19708L12.9697 1.13642L7.63634 6.46975L8.697 7.53041Z" fill="#20C43A"></path>
      </svg>
      <span class="text-xs text-green-500 font-medium">${value.toFixed(2)}%</span>
    </div>
  `,
  
  negativePriceChangeHTML: (value) => `
    <div class="flex flex-wrap items-center py-px px-1 border border-red-500 rounded-full">
      <svg class="mr-0.5" width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.66667 7.58341C7.25245 7.58341 6.91667 7.9192 6.91667 8.33341C6.91667 8.74763 7.25245 9.08341 7.66667 9.08341V7.58341ZM13 8.33341V9.08341C13.4142 9.08341 13.75 8.74763 13.75 8.33341H13ZM13.75 3.00008C13.75 2.58587 13.4142 2.25008 13 2.25008C12.5858 2.25008 12.25 2.58587 12.25 3.00008H13.75ZM1.53033 1.13642C1.23744 0.843525 0.762563 0.843525 0.46967 1.13642C0.176777 1.42931 0.176777 1.90418 0.46967 2.19708L1.53033 1.13642ZM5 5.66675L4.46967 6.19708C4.76256 6.48997 5.23744 6.48997 5.53033 6.19708L5 5.66675ZM7.66667 3.00008L8.197 2.46975C7.9041 2.17686 7.42923 2.17686 7.13634 2.46975L7.66667 3.00008ZM7.66667 9.08341H13V7.58341H7.66667V9.08341ZM13.75 8.33341V3.00008H12.25V8.33341H13.75ZM0.46967 2.19708L4.46967 6.19708L5.53033 5.13642L1.53033 1.13642L0.46967 2.19708ZM5.53033 6.19708L8.197 3.53041L7.13634 2.46975L4.46967 5.13642L5.53033 6.19708ZM7.13634 3.53041L12.4697 8.86374L13.5303 7.80308L8.197 2.46975L7.13634 3.53041Z" fill="#FF3131"></path>
      </svg>
      <span class="text-xs text-red-500 font-medium">${Math.abs(value).toFixed(2)}%</span>
    </div>
  `,
  
  formatPrice: (coin, price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      logger.error(`Invalid price for ${coin}:`, price);
      return 'N/A';
    }
    if (price < 0.000001) return price.toExponential(2);
    if (price < 0.001) return price.toFixed(8);
    if (price < 1) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toFixed(1);
  },
  
  setActiveContainer: (containerId) => {
    const containerIds = ['btc', 'xmr', 'part', 'pivx', 'firo', 'dash', 'ltc', 'doge', 'eth', 'dcr', 'zano', 'wow', 'bch'].map(id => `${id}-container`);
    containerIds.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        const innerDiv = container.querySelector('div');
        innerDiv.classList.toggle('active-container', id === containerId);
      }
    });
  },
  
  displayErrorMessage: (message) => {
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessage = document.getElementById('error-message');
    const chartContainer = document.querySelector('.container-to-blur');
    if (errorOverlay && errorMessage && chartContainer) {
      errorOverlay.classList.remove('hidden');
      errorMessage.textContent = message;
      chartContainer.classList.add('blurred');
    }
  },
  
  hideErrorMessage: () => {
    const errorOverlay = document.getElementById('error-overlay');
    const containersToBlur = document.querySelectorAll('.container-to-blur');
    if (errorOverlay) {
      errorOverlay.classList.add('hidden');
      containersToBlur.forEach(container => container.classList.remove('blurred'));
    }
  }
};

// Chart
const chartModule = {
  chart: null,
  currentCoin: 'BTC',
  loadStartTime: 0,
  verticalLinePlugin: {
    id: 'verticalLine',
    beforeDraw: (chart, args, options) => {
      if (chart.tooltip._active && chart.tooltip._active.length) {
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = options.lineWidth || 1;
        ctx.strokeStyle = options.lineColor || 'rgba(77, 132, 240, 0.5)';
        ctx.stroke();
        ctx.restore();
      }
    }
  },

initChart: () => {
    const ctx = document.getElementById('coin-chart').getContext('2d');
    if (!ctx) {
      logger.error('Failed to get chart context. Make sure the canvas element exists.');
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(77, 132, 240, 0.2)');
    gradient.addColorStop(1, 'rgba(77, 132, 240, 0)');

    chartModule.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Price',
          data: [],
          borderColor: 'rgba(77, 132, 240, 1)',
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: {
                hour: 'ha',
                day: 'MMM d'
              }
            },
            ticks: {
              source: 'data',
              maxTicksLimit: 10,
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              },
              color: 'rgba(156, 163, 175, 1)'
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: false,
            ticks: {
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              },
              color: 'rgba(156, 163, 175, 1)',
              callback: (value) => '$' + value.toLocaleString()
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: 'rgba(17, 24, 39, 1)',
            bodyColor: 'rgba(55, 65, 81, 1)',
            borderColor: 'rgba(226, 232, 240, 1)',
            borderWidth: 1,
            cornerRadius: 4,
            padding: 8,
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => {
                const date = new Date(tooltipItems[0].parsed.x);
                return date.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                  timeZone: 'UTC'
                });
              },
              label: (item) => {
                const value = item.parsed.y;
                return `${chartModule.currentCoin}: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
              }
            }
          },
          verticalLine: {
            lineWidth: 1,
            lineColor: 'rgba(77, 132, 240, 0.5)'
          }
        },
        elements: {
          point: {
            backgroundColor: 'transparent',
            borderColor: 'rgba(77, 132, 240, 1)',
            borderWidth: 2,
            radius: 0,
            hoverRadius: 4,
            hitRadius: 6,
            hoverBorderWidth: 2
          },
          line: {
            backgroundColor: gradient,
            borderColor: 'rgba(77, 132, 240, 1)',
            fill: true
          }
        }
      },
      plugins: [chartModule.verticalLinePlugin]
    });

    console.log('Chart initialized:', chartModule.chart);
  },

prepareChartData: (coinSymbol, data) => {
  console.log(`Preparing chart data for ${coinSymbol}:`, JSON.stringify(data, null, 2));
  const coin = config.coins.find(c => c.symbol === coinSymbol);
  if (!data || typeof data !== 'object' || data.error) {
    console.error(`Invalid data received for ${coinSymbol}:`, data);
    return [];
  }
  try {
    let preparedData;
    if (coin.usesCoinGecko) {
      if (!data.prices || !Array.isArray(data.prices)) {
        throw new Error(`Invalid CoinGecko data structure for ${coinSymbol}`);
      }
      preparedData = data.prices.map(entry => ({
        x: new Date(entry[0]),
        y: entry[1]
      }));

      if (config.currentResolution === 'day') {

        preparedData = chartModule.ensureHourlyData(preparedData);
      } else {

        preparedData = preparedData.filter((_, index) => index % 24 === 0);
      }
    } else {

      if (!data.Data || !data.Data.Data || !Array.isArray(data.Data.Data)) {
        throw new Error(`Invalid CryptoCompare data structure for ${coinSymbol}`);
      }
      preparedData = data.Data.Data.map(d => ({
        x: new Date(d.time * 1000),
        y: d.close
      }));
    }
    
    const expectedDataPoints = config.currentResolution === 'day' ? 24 : config.resolutions[config.currentResolution].days;
    if (preparedData.length < expectedDataPoints) {
      console.warn(`Insufficient data points for ${coinSymbol}. Expected ${expectedDataPoints}, got ${preparedData.length}`);
    }

    console.log(`Prepared data for ${coinSymbol}:`, preparedData.slice(0, 5));
    return preparedData;
  } catch (error) {
    console.error(`Error preparing chart data for ${coinSymbol}:`, error);
    return [];
  }
},

ensureHourlyData: (data) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourlyData = [];

  for (let i = 0; i < 24; i++) {
    const targetTime = new Date(twentyFourHoursAgo.getTime() + i * 60 * 60 * 1000);
    const closestDataPoint = data.reduce((prev, curr) => 
      Math.abs(curr.x - targetTime) < Math.abs(prev.x - targetTime) ? curr : prev
    );
    
    hourlyData.push({
      x: targetTime,
      y: closestDataPoint.y
    });
  }

  return hourlyData;
},
  
   updateChart: async (coinSymbol, forceRefresh = false) => {
    try {
      chartModule.showChartLoader();
      chartModule.loadStartTime = Date.now();
      
      const cacheKey = `chartData_${coinSymbol}_${config.currentResolution}`;
      const cacheDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      let cachedData = !forceRefresh ? cache.get(cacheKey) : null;
      let data;
      
      if (cachedData) {
        data = cachedData.value;
        console.log(`Using cached data for ${coinSymbol} (${config.currentResolution})`);
      } else {
        console.log(`Fetching fresh data for ${coinSymbol} (${config.currentResolution})`);
        data = await api.fetchHistoricalDataXHR(coinSymbol);
        if (data.error) {
          throw new Error(data.error);
        }
        cache.set(cacheKey, data, cacheDuration);
        cachedData = null;
      }

      const chartData = chartModule.prepareChartData(coinSymbol, data);

      if (chartModule.chart) {
        chartModule.chart.data.datasets[0].data = chartData;
        chartModule.chart.data.datasets[0].label = `${coinSymbol} Price (USD)`;

        const coin = config.coins.find(c => c.symbol === coinSymbol);
        let apiSource = coin.usesCoinGecko ? 'CoinGecko' : 'CryptoCompare';
        let currency = 'USD';
        
        const chartTitle = document.getElementById('chart-title');
        if (chartTitle) {
          chartTitle.textContent = `${coinSymbol} Price Chart`;
        }
        
        chartModule.chart.options.scales.y.title = {
          display: true,
          text: `Price (${currency}) - ${coinSymbol} - ${apiSource}`
        };
        
        if (coinSymbol === 'WOW') {
          chartModule.chart.options.scales.y.ticks.callback = (value) => {
            return '$' + value.toFixed(4);
          };
          
          chartModule.chart.options.plugins.tooltip.callbacks.label = (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toFixed(4);
            }
            return label;
          };
        } else {
          chartModule.chart.options.scales.y.ticks.callback = (value) => {
            return '$' + ui.formatPrice(coinSymbol, value);
          };
          
          chartModule.chart.options.plugins.tooltip.callbacks.label = (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + ui.formatPrice(coinSymbol, context.parsed.y);
            }
            return label;
          };
        }
        
        if (config.currentResolution === 'day') {
          chartModule.chart.options.scales.x = {
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'HH:mm'
              },
              tooltipFormat: 'MMM d, yyyy HH:mm'
            },
            ticks: {
              source: 'data',
              maxTicksLimit: 24,
              callback: function(value, index, values) {
                const date = new Date(value);
                return date.getUTCHours().toString().padStart(2, '0') + ':00';
              }
            }
          };
        } else {
          chartModule.chart.options.scales.x = {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: {
                day: 'MMM d'
              },
              tooltipFormat: 'MMM d, yyyy'
            },
            ticks: {
              source: 'data',
              maxTicksLimit: 10
            }
          };
        }
        
        console.log('Updating chart with data:', chartData.slice(0, 5));
        chartModule.chart.update('active');
      } else {
        console.error('Chart object not initialized');
      }

      chartModule.currentCoin = coinSymbol;
      const loadTime = Date.now() - chartModule.loadStartTime;
      ui.updateLoadTimeAndCache(loadTime, cachedData);

    } catch (error) {
      console.error(`Error updating chart for ${coinSymbol}:`, error);
      let errorMessage = `Failed to update chart for ${coinSymbol}`;
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      ui.displayErrorMessage(errorMessage);
    } finally {
      chartModule.hideChartLoader();
    }
  },
  
  showChartLoader: () => {
    document.getElementById('chart-loader').classList.remove('hidden');
    document.getElementById('coin-chart').classList.add('hidden');
  },
  
  hideChartLoader: () => {
    document.getElementById('chart-loader').classList.add('hidden');
    document.getElementById('coin-chart').classList.remove('hidden');
  }
};

Chart.register(chartModule.verticalLinePlugin);

  const volumeToggle = {
    isVisible: localStorage.getItem('volumeToggleState') === 'true',
    init: () => {
      const toggleButton = document.getElementById('toggle-volume');
      if (toggleButton) {
        toggleButton.addEventListener('click', volumeToggle.toggle);
        volumeToggle.updateVolumeDisplay();
      }
    },
    toggle: () => {
      volumeToggle.isVisible = !volumeToggle.isVisible;
      localStorage.setItem('volumeToggleState', volumeToggle.isVisible.toString());
      volumeToggle.updateVolumeDisplay();
    },
    updateVolumeDisplay: () => {
      const volumeDivs = document.querySelectorAll('[id$="-volume-div"]');
      volumeDivs.forEach(div => {
        div.style.display = volumeToggle.isVisible ? 'flex' : 'none';
      });
      const toggleButton = document.getElementById('toggle-volume');
      if (toggleButton) {
        updateButtonStyles(toggleButton, volumeToggle.isVisible, 'green');
      }
    }
  };

  function updateButtonStyles(button, isActive, color) {
    button.classList.toggle('text-' + color + '-500', isActive);
    button.classList.toggle('text-gray-600', !isActive);
    button.classList.toggle('dark:text-' + color + '-400', isActive);
    button.classList.toggle('dark:text-gray-400', !isActive);
  }

const app = {
  btcPriceUSD: 0,
  autoRefreshInterval: null,
  nextRefreshTime: null,
  lastRefreshedTime: null,
  isAutoRefreshEnabled: localStorage.getItem('autoRefreshEnabled') === 'true',
  refreshTexts: {
    label: 'Auto-refresh in',
    disabled: 'Auto-refresh: disabled',
    justRefreshed: 'Just refreshed',
  },
  
  init: () => {
    window.addEventListener('load', app.onLoad);
    app.loadLastRefreshedTime();
  },
  
  onLoad: async () => {
    ui.showLoader();
    try {
      volumeToggle.init();
      await app.updateBTCPrice();
      const chartContainer = document.getElementById('coin-chart');
      if (chartContainer) {
        chartModule.initChart();
        chartModule.showChartLoader();
      } else {
        console.warn('Chart container not found, skipping chart initialization');
      }
      for (const coin of config.coins) {
        await app.loadCoinData(coin);
      }
      if (chartModule.chart) {
        config.currentResolution = 'month';
        await chartModule.updateChart('BTC');
        app.updateResolutionButtons('BTC');
      }
      ui.setActiveContainer('btc-container');
      config.coins.forEach(coin => {
        const container = document.getElementById(`${coin.symbol.toLowerCase()}-container`);
        if (container) {
          container.addEventListener('click', () => {
            ui.setActiveContainer(`${coin.symbol.toLowerCase()}-container`);
            if (chartModule.chart) {
              if (coin.symbol === 'WOW') {
                config.currentResolution = 'day';
              }
              chartModule.updateChart(coin.symbol);
              app.updateResolutionButtons(coin.symbol);
            }
          });
        }
      });     
      const refreshAllButton = document.getElementById('refresh-all');
      if (refreshAllButton) {
        refreshAllButton.addEventListener('click', app.refreshAllData);
      }
      app.initializeSelectImages();
      const headers = document.querySelectorAll('th');
      headers.forEach((header, index) => {
        header.addEventListener('click', () => app.sortTable(index, header.classList.contains('disabled')));
      });
      const closeErrorButton = document.getElementById('close-error');
      if (closeErrorButton) {
        closeErrorButton.addEventListener('click', ui.hideErrorMessage);
      }
      app.initAutoRefresh();
    } catch (error) {
      console.error('Error during initialization:', error);
      ui.displayErrorMessage('Failed to initialize the dashboard. Please try refreshing the page.');
    } finally {
      ui.hideLoader();
      if (chartModule.chart) {
        chartModule.hideChartLoader();
      }
    }
  },

  loadCoinData: async (coin) => {
    const cacheKey = `coinData_${coin.symbol}`;
    let cachedData = cache.get(cacheKey);
    let data;
    if (cachedData) {
      data = cachedData.value;
    } else {
      try {
        ui.showCoinLoader(coin.symbol);
        if (coin.usesCoinGecko) {
          data = await api.fetchCoinGeckoDataXHR(coin.symbol);
        } else {
          data = await api.fetchCryptoCompareDataXHR(coin.symbol);
        }
        if (data.error) {
          throw new Error(data.error);
        }
        cache.set(cacheKey, data);
        cachedData = null;
      } catch (error) {
        console.error(`Error fetching ${coin.symbol} data:`, error.message);
        data = {
          error: error.message
        };
      } finally {
        ui.hideCoinLoader(coin.symbol);
      }
    }
    ui.displayCoinData(coin.symbol, data);
    ui.updateLoadTimeAndCache(0, cachedData);
  },

  initAutoRefresh: () => {
    const toggleAutoRefreshButton = document.getElementById('toggle-auto-refresh');
    if (toggleAutoRefreshButton) {
      toggleAutoRefreshButton.addEventListener('click', app.toggleAutoRefresh);
      app.updateAutoRefreshButton();
    }

    if (app.isAutoRefreshEnabled) {
      const storedNextRefreshTime = localStorage.getItem('nextRefreshTime');
      if (storedNextRefreshTime) {
        const nextRefreshTime = parseInt(storedNextRefreshTime);
        if (nextRefreshTime > Date.now()) {
          app.nextRefreshTime = nextRefreshTime;
          app.startAutoRefresh();
        } else {
          app.startAutoRefresh(true);
        }
      } else {
        app.startAutoRefresh(true);
      }
    }
  },
  
  startAutoRefresh: (resetTimer = false) => {
    app.stopAutoRefresh();
    
    if (resetTimer || !app.nextRefreshTime) {
      app.nextRefreshTime = Date.now() + 15 * 60 * 1000;
    }
    
    const timeUntilNextRefresh = Math.max(0, app.nextRefreshTime - Date.now());
    
    if (timeUntilNextRefresh === 0) {
      app.nextRefreshTime = Date.now() + 15 * 60 * 1000;
    }
    
    app.autoRefreshInterval = setTimeout(() => {
      app.refreshAllData();
      app.startAutoRefresh(true);
    }, timeUntilNextRefresh);
    
    localStorage.setItem('nextRefreshTime', app.nextRefreshTime.toString());
    app.updateNextRefreshTime();
    app.isAutoRefreshEnabled = true;
    localStorage.setItem('autoRefreshEnabled', 'true');
  },

  stopAutoRefresh: () => {
    if (app.autoRefreshInterval) {
      clearTimeout(app.autoRefreshInterval);
      app.autoRefreshInterval = null;
    }
    app.nextRefreshTime = null;
    localStorage.removeItem('nextRefreshTime');
    app.updateNextRefreshTime();
    app.isAutoRefreshEnabled = false;
    localStorage.setItem('autoRefreshEnabled', 'false');
  },

  toggleAutoRefresh: () => {
    if (app.isAutoRefreshEnabled) {
      app.stopAutoRefresh();
    } else {
      app.startAutoRefresh();
    }
    app.updateAutoRefreshButton();
  },
  
  updateNextRefreshTime: () => {
    const nextRefreshSpan = document.getElementById('next-refresh-time');
    const labelElement = document.getElementById('next-refresh-label');
    const valueElement = document.getElementById('next-refresh-value');
    
    if (nextRefreshSpan && labelElement && valueElement) {
      if (app.nextRefreshTime) {
        const timeUntilRefresh = Math.max(0, Math.ceil((app.nextRefreshTime - Date.now()) / 1000));
        
        if (timeUntilRefresh === 0) {
          labelElement.textContent = '';
          valueElement.textContent = app.refreshTexts.justRefreshed;
        } else {
          const minutes = Math.floor(timeUntilRefresh / 60);
          const seconds = timeUntilRefresh % 60;
          labelElement.textContent = `${app.refreshTexts.label}: `;
          valueElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeUntilRefresh > 0) {
          setTimeout(app.updateNextRefreshTime, 1000);
        }
      } else {
        labelElement.textContent = '';
        valueElement.textContent = app.refreshTexts.disabled;
      }
    }
  },

  updateAutoRefreshButton: () => {
  const button = document.getElementById('toggle-auto-refresh');
  if (button) {
    if (app.isAutoRefreshEnabled) {
      button.classList.remove('text-gray-600', 'dark:text-gray-400');
      button.classList.add('text-green-500', 'dark:text-green-400');
      app.startSpinAnimation();
    } else {
      button.classList.remove('text-green-500', 'dark:text-green-400');
      button.classList.add('text-gray-600', 'dark:text-gray-400');
      app.stopSpinAnimation();
    }
    button.title = app.isAutoRefreshEnabled ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh';
  }
},

startSpinAnimation: () => {
  const svg = document.querySelector('#toggle-auto-refresh svg');
  if (svg) {
    svg.classList.add('animate-spin');
    setTimeout(() => {
      svg.classList.remove('animate-spin');
    }, 2000); // Remove the animation after 2 seconds
  }
},

stopSpinAnimation: () => {
  const svg = document.querySelector('#toggle-auto-refresh svg');
  if (svg) {
    svg.classList.remove('animate-spin');
  }
},
    
  refreshAllData: async () => {
    ui.showLoader();
    chartModule.showChartLoader();
    try {
      cache.clear();
      await app.updateBTCPrice();
      for (const coin of config.coins) {
        await app.loadCoinData(coin);
      }
      if (chartModule.currentCoin) {
        await chartModule.updateChart(chartModule.currentCoin, true);
      }
      
      app.lastRefreshedTime = new Date();
      localStorage.setItem('lastRefreshedTime', app.lastRefreshedTime.getTime().toString());
      ui.updateLastRefreshedTime();

    } catch (error) {
      console.error('Error refreshing all data:', error);
      ui.displayErrorMessage('Failed to refresh all data. Please try again.');
    } finally {
      ui.hideLoader();
      chartModule.hideChartLoader();
    }
  },
  
  updateLastRefreshedTime: () => {
    const lastRefreshedElement = document.getElementById('last-refreshed-time');
    if (lastRefreshedElement && app.lastRefreshedTime) {
      const formattedTime = app.lastRefreshedTime.toLocaleTimeString();
      lastRefreshedElement.textContent = `Last Refreshed: ${formattedTime}`;
    }
  },
  
  loadLastRefreshedTime: () => {
    const storedTime = localStorage.getItem('lastRefreshedTime');
    if (storedTime) {
      app.lastRefreshedTime = new Date(parseInt(storedTime));
      ui.updateLastRefreshedTime();
    }
  },
  
  updateBTCPrice: async () => {
    try {
      const btcData = await api.fetchCryptoCompareDataXHR('BTC');
      if (btcData.error) {
        console.error('Error fetching BTC price:', btcData.error);
        app.btcPriceUSD = 0;
      } else if (btcData.RAW && btcData.RAW.BTC && btcData.RAW.BTC.USD) {
        app.btcPriceUSD = btcData.RAW.BTC.USD.PRICE;
      } else {
        console.error('Unexpected BTC data structure:', btcData);
        app.btcPriceUSD = 0;
      }
    } catch (error) {
      console.error('Error fetching BTC price:', error);
      app.btcPriceUSD = 0;
    }
    console.log('Current BTC price:', app.btcPriceUSD);
  },
  
  sortTable: (columnIndex) => {
    const sortableColumns = [5, 6];
    if (!sortableColumns.includes(columnIndex)) return;
    const table = document.querySelector('table');
    if (!table) {
      console.error("Table not found for sorting.");
      return;
    }
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const sortIcon = document.getElementById(`sort-icon-${columnIndex}`);
    if (!sortIcon) {
      console.error("Sort icon not found.");
      return;
    }
    const sortOrder = sortIcon.textContent === '↓' ? 1 : -1;
    sortIcon.textContent = sortOrder === 1 ? '↑' : '↓';
    rows.sort((a, b) => {
      const aValue = a.cells[columnIndex]?.textContent.trim() || '';
      const bValue = b.cells[columnIndex]?.textContent.trim() || '';
      return aValue.localeCompare(bValue, undefined, {
        numeric: true,
        sensitivity: 'base'
      }) * sortOrder;
    });
    const tbody = table.querySelector('tbody');
    if (tbody) {
      rows.forEach(row => tbody.appendChild(row));
    } else {
      console.error("Table body not found.");
    }
  },
  
  initializeSelectImages: () => {
    const updateSelectedImage = (selectId) => {
      const select = document.getElementById(selectId);
      const button = document.getElementById(`${selectId}_button`);
      if (!select || !button) {
        console.error(`Elements not found for ${selectId}`);
        return;
      }
      const selectedOption = select.options[select.selectedIndex];
      const imageURL = selectedOption?.getAttribute('data-image');
      requestAnimationFrame(() => {
        if (imageURL) {
          button.style.backgroundImage = `url('${imageURL}')`;
          button.style.backgroundSize = '25px 25px';
          button.style.backgroundPosition = 'center';
          button.style.backgroundRepeat = 'no-repeat';
        } else {
          button.style.backgroundImage = 'none';
        }
        button.style.minWidth = '25px';
        button.style.minHeight = '25px';
      });
    };
    const handleSelectChange = (event) => {
      updateSelectedImage(event.target.id);
    };
    ['coin_to', 'coin_from'].forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.addEventListener('change', handleSelectChange);
        updateSelectedImage(selectId);
      } else {
        console.error(`Select element not found for ${selectId}`);
      }
    });
  },

  updateResolutionButtons: (coinSymbol) => {
    const resolutionButtons = document.querySelectorAll('.resolution-button');
    resolutionButtons.forEach(button => {
      const resolution = button.id.split('-')[1];
      if (coinSymbol === 'WOW') {
        if (resolution === 'day') {
          button.classList.remove('text-gray-400', 'cursor-not-allowed', 'opacity-50', 'outline-none');
          button.classList.add('active');
          button.disabled = false;
        } else {
          button.classList.add('text-gray-400', 'cursor-not-allowed', 'opacity-50', 'outline-none');
          button.classList.remove('active');
          button.disabled = true;
        }
      } else {
        button.classList.remove('text-gray-400', 'cursor-not-allowed', 'opacity-50', 'outline-none');
        button.classList.toggle('active', resolution === config.currentResolution);
        button.disabled = false;
      }
    });
  },
};

const resolutionButtons = document.querySelectorAll('.resolution-button');
resolutionButtons.forEach(button => {
  button.addEventListener('click', () => {
    const resolution = button.id.split('-')[1];
    const currentCoin = chartModule.currentCoin;
    
    if (currentCoin !== 'WOW' || resolution === 'day') {
      config.currentResolution = resolution;
      chartModule.updateChart(currentCoin, true);
      app.updateResolutionButtons(currentCoin);
    }
  });
});

app.init();

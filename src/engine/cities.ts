/**
 * 出生地城市经度数据（东经，度）。
 * 用于真太阳时校正的经度差计算。数据为公开地理常识，可手动输入经度覆盖。
 */
import type { City } from './types';

export const CITIES: City[] = [
  { id: 'beijing', name: '北京', province: '北京', longitude: 116.41 },
  { id: 'shanghai', name: '上海', province: '上海', longitude: 121.47 },
  { id: 'tianjin', name: '天津', province: '天津', longitude: 117.20 },
  { id: 'chongqing', name: '重庆', province: '重庆', longitude: 106.55 },
  { id: 'guangzhou', name: '广州', province: '广东', longitude: 113.26 },
  { id: 'shenzhen', name: '深圳', province: '广东', longitude: 114.06 },
  { id: 'dongguan', name: '东莞', province: '广东', longitude: 113.75 },
  { id: 'foshan', name: '佛山', province: '广东', longitude: 113.12 },
  { id: 'zhuhai', name: '珠海', province: '广东', longitude: 113.58 },
  { id: 'hangzhou', name: '杭州', province: '浙江', longitude: 120.15 },
  { id: 'ningbo', name: '宁波', province: '浙江', longitude: 121.55 },
  { id: 'wenzhou', name: '温州', province: '浙江', longitude: 120.70 },
  { id: 'nanjing', name: '南京', province: '江苏', longitude: 118.80 },
  { id: 'suzhou', name: '苏州', province: '江苏', longitude: 120.58 },
  { id: 'wuxi', name: '无锡', province: '江苏', longitude: 120.31 },
  { id: 'xuzhou', name: '徐州', province: '江苏', longitude: 117.28 },
  { id: 'hefei', name: '合肥', province: '安徽', longitude: 117.23 },
  { id: 'fuzhou', name: '福州', province: '福建', longitude: 119.30 },
  { id: 'xiamen', name: '厦门', province: '福建', longitude: 118.09 },
  { id: 'quanzhou', name: '泉州', province: '福建', longitude: 118.68 },
  { id: 'nanchang', name: '南昌', province: '江西', longitude: 115.86 },
  { id: 'jinan', name: '济南', province: '山东', longitude: 117.12 },
  { id: 'qingdao', name: '青岛', province: '山东', longitude: 120.38 },
  { id: 'yantai', name: '烟台', province: '山东', longitude: 121.45 },
  { id: 'zhengzhou', name: '郑州', province: '河南', longitude: 113.63 },
  { id: 'luoyang', name: '洛阳', province: '河南', longitude: 112.45 },
  { id: 'wuhan', name: '武汉', province: '湖北', longitude: 114.31 },
  { id: 'yichang', name: '宜昌', province: '湖北', longitude: 111.29 },
  { id: 'changsha', name: '长沙', province: '湖南', longitude: 112.94 },
  { id: 'chengdu', name: '成都', province: '四川', longitude: 104.07 },
  { id: 'mianyang', name: '绵阳', province: '四川', longitude: 104.68 },
  { id: 'guiyang', name: '贵阳', province: '贵州', longitude: 106.63 },
  { id: 'kunming', name: '昆明', province: '云南', longitude: 102.83 },
  { id: 'xian', name: '西安', province: '陕西', longitude: 108.94 },
  { id: 'lanzhou', name: '兰州', province: '甘肃', longitude: 103.83 },
  { id: 'xining', name: '西宁', province: '青海', longitude: 101.78 },
  { id: 'yinchuan', name: '银川', province: '宁夏', longitude: 106.23 },
  { id: 'wulumuqi', name: '乌鲁木齐', province: '新疆', longitude: 87.62 },
  { id: 'kashi', name: '喀什', province: '新疆', longitude: 75.99 },
  { id: 'huhehaote', name: '呼和浩特', province: '内蒙古', longitude: 111.75 },
  { id: 'baotou', name: '包头', province: '内蒙古', longitude: 109.84 },
  { id: 'shenyang', name: '沈阳', province: '辽宁', longitude: 123.43 },
  { id: 'dalian', name: '大连', province: '辽宁', longitude: 121.61 },
  { id: 'changchun', name: '长春', province: '吉林', longitude: 125.32 },
  { id: 'haerbin', name: '哈尔滨', province: '黑龙江', longitude: 126.53 },
  { id: 'shijiazhuang', name: '石家庄', province: '河北', longitude: 114.51 },
  { id: 'tangshan', name: '唐山', province: '河北', longitude: 118.18 },
  { id: 'taiyuan', name: '太原', province: '山西', longitude: 112.55 },
  { id: 'nanning', name: '南宁', province: '广西', longitude: 108.37 },
  { id: 'guilin', name: '桂林', province: '广西', longitude: 110.29 },
  { id: 'haikou', name: '海口', province: '海南', longitude: 110.35 },
  { id: 'sanya', name: '三亚', province: '海南', longitude: 109.51 },
  { id: 'lasa', name: '拉萨', province: '西藏', longitude: 91.11 },
  { id: 'taibei', name: '台北', province: '台湾', longitude: 121.56 },
  { id: 'gaoxiong', name: '高雄', province: '台湾', longitude: 120.31 },
  { id: 'xianggang', name: '香港', province: '香港', longitude: 114.17 },
  { id: 'aomen', name: '澳门', province: '澳门', longitude: 113.54 },
];

export function cityById(id?: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/** 按省份分组，便于下拉渲染 */
export function citiesByProvince(): { province: string; cities: City[] }[] {
  const map = new Map<string, City[]>();
  for (const c of CITIES) {
    if (!map.has(c.province)) map.set(c.province, []);
    map.get(c.province)!.push(c);
  }
  return [...map.entries()].map(([province, cities]) => ({ province, cities }));
}
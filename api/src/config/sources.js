export const SOURCE_LEVEL_WEIGHT = {
  S: 3,
  A: 2,
  B: 1
};

export const EVIDENCE_INDEX = [
  {
    id: 'e1',
    title: '高血压治疗需遵循规范诊疗，不建议以单一食物替代治疗',
    source: '国家卫生健康委（示例）',
    url: 'https://www.nhc.gov.cn/',
    publish_time: '2024-11-01',
    credibility: 'S',
    stance: 'refute',
    topics: ['健康'],
    keywords: ['高血压', '食物', '治疗', '治愈', '偏方'],
    quote: '未有权威证据支持单一食物治愈高血压。'
  },
  {
    id: 'e2',
    title: '接种疫苗可降低重症风险',
    source: '中国疾控中心（示例）',
    url: 'https://www.chinacdc.cn/',
    publish_time: '2025-03-20',
    credibility: 'S',
    stance: 'support',
    topics: ['健康'],
    keywords: ['疫苗', '重症', '预防', '接种'],
    quote: '规范接种可显著降低重症和死亡风险。'
  },
  {
    id: 'e3',
    title: '警惕“验证码/转账”类诈骗话术',
    source: '公安部刑侦局（示例）',
    url: 'https://www.mps.gov.cn/',
    publish_time: '2025-08-10',
    credibility: 'S',
    stance: 'refute',
    topics: ['诈骗'],
    keywords: ['验证码', '转账', '退款', '客服', '银行卡'],
    quote: '凡索要验证码和转账的“客服”均需高度警惕。'
  },
  {
    id: 'e4',
    title: '政策信息应以政府官网和权威公报为准',
    source: '中国政府网（示例）',
    url: 'https://www.gov.cn/',
    publish_time: '2025-06-01',
    credibility: 'S',
    stance: 'refute',
    topics: ['政策'],
    keywords: ['官方宣布', '新规', '政策', '紧急通知', '马上转发'],
    quote: '涉及政策的新规请核对官方发布渠道。'
  },
  {
    id: 'e5',
    title: '健康科普信息需参考正规指南，不轻信“包治百病”',
    source: '人民日报健康客户端（示例）',
    url: 'https://health.people.com.cn/',
    publish_time: '2025-05-12',
    credibility: 'A',
    stance: 'refute',
    topics: ['健康'],
    keywords: ['包治百病', '保健品', '神药', '偏方'],
    quote: '“包治百病”通常属于夸大宣传或虚假宣传。'
  },
  {
    id: 'e6',
    title: '勤洗手、戴口罩等可降低呼吸道传播风险',
    source: '世界卫生组织（示例）',
    url: 'https://www.who.int/',
    publish_time: '2025-01-15',
    credibility: 'A',
    stance: 'support',
    topics: ['健康'],
    keywords: ['勤洗手', '戴口罩', '传播风险', '呼吸道'],
    quote: '基础防护措施可有效降低传播风险。'
  },
  {
    id: 'e7',
    title: '警惕“保本高收益”金融宣传',
    source: '国家金融监督管理总局（示例）',
    url: 'https://www.cbirc.gov.cn/',
    publish_time: '2025-09-22',
    credibility: 'S',
    stance: 'refute',
    topics: ['金融'],
    keywords: ['保本', '高收益', '稳赚不赔', '投资群'],
    quote: '承诺保本高收益多为非法金融活动高风险信号。'
  },
  {
    id: 'e8',
    title: '百科和自媒体内容应与权威来源交叉验证',
    source: '科普中国（示例）',
    url: 'https://www.kepuchina.cn/',
    publish_time: '2025-07-01',
    credibility: 'B',
    stance: 'unrelated',
    topics: ['通用'],
    keywords: ['科普', '核实', '来源'],
    quote: '建议交叉比对来源，避免断章取义。'
  }
];

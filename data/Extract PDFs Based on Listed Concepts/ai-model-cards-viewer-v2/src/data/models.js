// Model data updated with latest LifeArchitect.ai rankings (August 2025)
export const models = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    family: 'gpt',
    license: 'Proprietary',
    releaseDate: '2025-08-07',
    description: 'OpenAI\'s most advanced unified system with smart and fast model for most questions, plus deeper reasoning for harder problems.',
    capabilities: ['reasoning', 'coding', 'mathematics', 'writing', 'multimodal', 'tool-calling', 'agentic-tasks'],
    contextWindow: null, // Not specified in search results
    activeParams: null,
    totalParams: null,
    architecture: 'Unified system with multiple reasoning modes',
    layers: null,
    memoryRequirement: 'API only',
    benchmarkScores: {
      gpqa: 89.4,
      hle: 42.0
    },
    urls: {
      modelCard: 'https://openai.com/index/introducing-gpt-5/',
      systemCard: 'https://openai.com/index/gpt-5-system-card/',
      pdf: 'https://cdn.openai.com/gpt-5-system-card.pdf',
      api: 'https://openai.com/gpt-5/'
    },
    strengths: [
      'State-of-the-art performance across all domains',
      'Unified system with multiple reasoning modes',
      'Advanced coding and agentic capabilities',
      'Significant leap in intelligence over previous models'
    ],
    useCases: [
      'Complex reasoning and problem solving',
      'Advanced coding and software development',
      'Agentic task automation',
      'High-stakes decision making'
    ]
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    family: 'grok',
    license: 'Proprietary',
    releaseDate: '2025-07-09',
    description: 'xAI\'s flagship model with advanced reasoning and tool-use capabilities, ranking #2 on GPQA and #1 on HLE benchmarks.',
    capabilities: ['reasoning', 'tool-calling', 'real-time-search', 'multimodal', 'vision'],
    contextWindow: null,
    activeParams: null,
    totalParams: null,
    architecture: 'Unknown',
    layers: null,
    memoryRequirement: 'API only',
    benchmarkScores: {
      gpqa: 88.9,
      hle: 44.4
    },
    urls: {
      modelCard: 'https://x.ai/news/grok-4',
      pdf: 'https://data.x.ai/2025-08-20-grok-4-model-card.pdf',
      announcement: 'https://x.ai/news/grok-4'
    },
    strengths: [
      'Top performance on HLE benchmark (44.4)',
      'Strong GPQA performance (88.9)',
      'Native tool use integration',
      'Real-time search capabilities'
    ],
    useCases: [
      'Complex reasoning tasks',
      'Real-time information retrieval',
      'Multimodal applications',
      'Advanced AI research'
    ]
  },
  {
    id: 'o3-preview',
    name: 'o3-preview',
    provider: 'OpenAI',
    family: 'o-series',
    license: 'Proprietary',
    releaseDate: '2024-12-01',
    description: 'OpenAI\'s advanced reasoning model, predecessor to the o-series, showing strong performance on complex reasoning tasks.',
    capabilities: ['reasoning', 'mathematics', 'coding', 'complex-problem-solving'],
    contextWindow: null,
    activeParams: null,
    totalParams: null,
    architecture: 'Reasoning-focused transformer',
    layers: null,
    memoryRequirement: 'API only',
    benchmarkScores: {
      gpqa: 87.7,
      hle: 24.9
    },
    urls: {
      modelCard: 'https://openai.com/index/introducing-o3-and-o4-mini/',
      documentation: 'https://platform.openai.com/docs/models/o3'
    },
    strengths: [
      'Strong reasoning capabilities',
      'High GPQA performance (87.7)',
      'Advanced mathematical problem solving',
      'Complex coding tasks'
    ],
    useCases: [
      'Mathematical reasoning',
      'Complex problem solving',
      'Advanced coding challenges',
      'Research and analysis'
    ]
  },
  {
    id: 'gemini-2-5-pro-06-05',
    name: 'Gemini 2.5 Pro 06-05',
    provider: 'Google',
    family: 'gemini',
    license: 'Proprietary',
    releaseDate: '2025-06-05',
    description: 'Google\'s advanced reasoning Gemini model with strong performance across multiple benchmarks.',
    capabilities: ['reasoning', 'multimodal', 'vision', 'audio', 'video', 'large-context'],
    contextWindow: null,
    activeParams: null,
    totalParams: null,
    architecture: 'Multimodal transformer',
    layers: null,
    memoryRequirement: 'API only',
    benchmarkScores: {
      gpqa: 86.4,
      hle: 21.6
    },
    urls: {
      modelCard: 'https://deepmind.google/models/gemini/pro/',
      documentation: 'https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro'
    },
    strengths: [
      'Strong multimodal capabilities',
      'Large context window support',
      'Consistent performance across benchmarks',
      'Advanced vision and audio processing'
    ],
    useCases: [
      'Multimodal applications',
      'Large document analysis',
      'Vision and audio processing',
      'Complex reasoning tasks'
    ]
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    family: 'claude',
    license: 'Proprietary',
    releaseDate: '2025-02-24',
    description: 'Anthropic\'s hybrid reasoning model with extended thinking capabilities and strong safety measures.',
    capabilities: ['reasoning', 'extended-thinking', 'step-by-step-analysis', 'complex-problem-solving'],
    contextWindow: null,
    activeParams: null,
    totalParams: null,
    architecture: 'Hybrid reasoning model',
    layers: null,
    memoryRequirement: 'API only',
    benchmarkScores: {
      gpqa: 84.8,
      hle: null
    },
    urls: {
      modelCard: 'https://www.anthropic.com/news/claude-3-7-sonnet',
      systemCard: 'https://www.anthropic.com/claude-3-7-sonnet-system-card',
      documentation: 'https://docs.anthropic.com/en/docs/about-claude/models/overview'
    },
    strengths: [
      'Extended thinking capabilities',
      'Strong safety and alignment',
      'Hybrid reasoning approach',
      'Excellent for complex analysis'
    ],
    useCases: [
      'Safety-critical applications',
      'Extended analysis and thinking',
      'Complex reasoning tasks',
      'Research and development'
    ]
  },
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    family: 'claude',
    license: 'Proprietary',
    releaseDate: '2025-05-22',
    description: 'Anthropic\'s most powerful model designed for highly complex tasks and deep reasoning.',
    capabilities: ['reasoning', 'complex-problem-solving', 'agentic-tasks', 'deep-analysis'],
    contextWindow: null,
    activeParams: null,
    totalParams: null,
    architecture: 'Advanced reasoning transformer',
    layers: null,
    memoryRequirement: 'API only',
    benchmarkScores: {
      gpqa: 83.3,
      hle: null
    },
    urls: {
      modelCard: 'https://www.prompthub.us/models/claude-opus-4',
      systemCard: 'https://www.anthropic.com/claude-4-system-card',
      announcement: 'https://www.anthropic.com/news/claude-opus-4-1'
    },
    strengths: [
      'Highest complexity task handling',
      'Deep reasoning capabilities',
      'Advanced agentic performance',
      'Strong safety measures'
    ],
    useCases: [
      'Highly complex reasoning',
      'Advanced research tasks',
      'Agentic workflows',
      'Deep analysis projects'
    ]
  },
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS-120B',
    provider: 'OpenAI',
    family: 'gpt-oss',
    license: 'Apache 2.0',
    releaseDate: '2025-08-05',
    description: 'Open-weight reasoning model with 120B parameters, achieving strong performance on HLE benchmark (19.0).',
    capabilities: ['reasoning', 'tool-calling', 'chain-of-thought', 'structured-output', 'complex-problem-solving'],
    contextWindow: 131072,
    activeParams: '5.1B',
    totalParams: '120B',
    architecture: 'MoE (128 experts/layer, 4 active)',
    layers: 36,
    memoryRequirement: '80GB',
    benchmarkScores: {
      gpqa: null,
      hle: 19.0
    },
    urls: {
      modelCard: 'https://openai.com/index/gpt-oss-model-card/',
      pdf: 'https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf',
      github: 'https://github.com/openai/gpt-oss',
      announcement: 'https://openai.com/index/introducing-gpt-oss/'
    },
    strengths: [
      'Strong open-source performance (HLE: 19.0)',
      'Runs efficiently on single 80GB GPU',
      'Apache 2.0 license for commercial use',
      'Advanced reasoning capabilities'
    ],
    useCases: [
      'Local deployment for privacy',
      'Production reasoning applications',
      'Cost-effective AI solutions',
      'Open-source development'
    ]
  },
  {
    id: 'gpt-oss-20b',
    name: 'GPT-OSS-20B',
    provider: 'OpenAI',
    family: 'gpt-oss',
    license: 'Apache 2.0',
    releaseDate: '2025-08-05',
    description: 'Smaller open-weight reasoning model with 20B parameters, efficient for local deployment with HLE score of 17.3.',
    capabilities: ['reasoning', 'tool-calling', 'chain-of-thought', 'structured-output'],
    contextWindow: 131072,
    activeParams: '3.6B',
    totalParams: '20B',
    architecture: 'MoE (32 experts/layer, 4 active)',
    layers: 24,
    memoryRequirement: '16GB',
    benchmarkScores: {
      gpqa: null,
      hle: 17.3
    },
    urls: {
      modelCard: 'https://openai.com/index/gpt-oss-model-card/',
      pdf: 'https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf',
      github: 'https://github.com/openai/gpt-oss',
      announcement: 'https://openai.com/index/introducing-gpt-oss/'
    },
    strengths: [
      'Efficient reasoning with low memory (16GB)',
      'Strong tool calling capabilities',
      'Fast inference speed',
      'Open source with permissive license'
    ],
    useCases: [
      'Local deployment for privacy',
      'Cost-effective reasoning tasks',
      'Edge computing applications',
      'Development and experimentation'
    ]
  },
  {
    id: 'deepseek-v3-1-base',
    name: 'DeepSeek-V3.1-Base',
    provider: 'DeepSeek',
    family: 'deepseek',
    license: 'MIT',
    releaseDate: '2025-08-20',
    description: 'Hybrid model supporting both thinking and non-thinking modes with strong performance on HLE benchmark (29.8).',
    capabilities: ['reasoning', 'thinking-mode', 'coding', 'mathematics', 'hybrid-reasoning'],
    contextWindow: 128000,
    activeParams: '37B',
    totalParams: '671B',
    architecture: 'Mixture-of-Experts (MoE)',
    layers: null,
    memoryRequirement: 'Variable (open source)',
    benchmarkScores: {
      gpqa: null,
      hle: 29.8
    },
    urls: {
      modelCard: 'https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Base',
      api: 'https://api-docs.deepseek.com/quick_start/pricing',
      documentation: 'https://api-docs.deepseek.com/'
    },
    strengths: [
      'Hybrid thinking/non-thinking modes',
      'Strong HLE performance (29.8)',
      'Cost-effective with 68x advantage',
      'Open source with MIT license'
    ],
    useCases: [
      'Hybrid reasoning applications',
      'Cost-sensitive deployments',
      'Mathematical and coding tasks',
      'Open-source AI development'
    ]
  },
  {
    id: 'qwen3-235b-a22b',
    name: 'Qwen3-235B-A22B',
    provider: 'Alibaba',
    family: 'qwen',
    license: 'Apache 2.0',
    releaseDate: '2025-07-08',
    description: 'Large MoE model with 235B total parameters and 22B activated, designed for efficient compute with strong performance.',
    capabilities: ['reasoning', 'coding', 'mathematics', 'multilingual', 'thinking-mode'],
    contextWindow: 131072,
    activeParams: '22B',
    totalParams: '235B',
    architecture: 'Mixture-of-Experts (MoE)',
    layers: null,
    memoryRequirement: 'Variable (open weights)',
    benchmarkScores: {
      gpqa: 81.1,
      hle: null
    },
    urls: {
      modelCard: 'https://huggingface.co/Qwen/Qwen3-235B-A22B',
      blog: 'https://qwenlm.github.io/blog/qwen3/',
      cerebras: 'https://www.cerebras.ai/press-release/cerebras-launches-qwen3-235b-world-s-fastest-frontier-ai-model-with-full-131k-context-support'
    },
    strengths: [
      'Efficient MoE architecture',
      'Strong GPQA performance (81.1)',
      'Full 131K context support',
      'World\'s fastest frontier model (on Cerebras)'
    ],
    useCases: [
      'Large-scale reasoning tasks',
      'Multilingual applications',
      'High-performance computing',
      'Research and development'
    ]
  }
];

// Helper functions for filtering and sorting
export const getModelsByProvider = (provider) => {
  return models.filter(model => model.provider === provider);
};

export const getOpenSourceModels = () => {
  return models.filter(model => 
    model.license === 'Apache 2.0' || 
    model.license === 'MIT' || 
    model.license.includes('Custom')
  );
};

export const getProprietaryModels = () => {
  return models.filter(model => model.license === 'Proprietary');
};

export const getModelsByCapability = (capability) => {
  return models.filter(model => model.capabilities.includes(capability));
};

export const getTopPerformingModels = () => {
  return models.sort((a, b) => {
    // Sort by GPQA score first, then HLE score
    const aGpqa = a.benchmarkScores?.gpqa || 0;
    const bGpqa = b.benchmarkScores?.gpqa || 0;
    if (aGpqa !== bGpqa) return bGpqa - aGpqa;
    
    const aHle = a.benchmarkScores?.hle || 0;
    const bHle = b.benchmarkScores?.hle || 0;
    return bHle - aHle;
  });
};


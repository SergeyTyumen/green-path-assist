import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Поиск поставщиков по категориям
async function findSuppliers(categories: string[], userId: string): Promise<any> {
  console.log('Finding suppliers for categories:', categories);

  // Получаем существующих поставщиков из базы
  const { data: existingSuppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching suppliers:', error);
  }

  // Фильтруем по категориям
  const relevantSuppliers = (existingSuppliers || []).filter(supplier => 
    categories.some(category => 
      supplier.categories.some((supplierCategory: string) => 
        supplierCategory.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(supplierCategory.toLowerCase())
      )
    )
  );

  // Генерируем рекомендации для новых поставщиков
  const recommendations = await generateSupplierRecommendations(categories, relevantSuppliers);

  return {
    success: true,
    existing_suppliers: relevantSuppliers,
    recommendations: recommendations,
    categories_searched: categories,
    total_found: relevantSuppliers.length
  };
}

// Запрос цен у поставщиков
async function requestPrices(supplierRequests: any[], userId: string): Promise<any> {
  console.log('Requesting prices from suppliers:', supplierRequests.length);

  const results = [];
  
  for (const request of supplierRequests) {
    try {
      // Получаем данные поставщика
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', request.supplier_id)
        .eq('user_id', userId)
        .single();

      if (error || !supplier) {
        results.push({
          supplier_id: request.supplier_id,
          success: false,
          error: 'Поставщик не найден'
        });
        continue;
      }

      // Генерируем запрос цен
      const priceRequestContent = await generatePriceRequest(request, supplier);
      
      // Имитируем отправку запроса (в реальной системе здесь будет email/API)
      const requestSent = await simulatePriceRequestSending(supplier, priceRequestContent, request);

      if (requestSent) {
        // Логируем запрос
        await logSupplierRequest(userId, supplier.id, 'price_request', {
          materials: request.materials,
          request_content: priceRequestContent
        });

        results.push({
          supplier_id: request.supplier_id,
          supplier_name: supplier.name,
          success: true,
          sent_at: new Date().toISOString(),
          contact_method: supplier.email ? 'email' : 'phone'
        });
      } else {
        results.push({
          supplier_id: request.supplier_id,
          success: false,
          error: 'Ошибка отправки запроса'
        });
      }
    } catch (error) {
      results.push({
        supplier_id: request.supplier_id,
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }

  return {
    success: true,
    requests_sent: results.filter(r => r.success).length,
    total_requests: results.length,
    results: results
  };
}

// Анализ предложений поставщиков
async function analyzeOffers(offers: any[], userId: string): Promise<any> {
  console.log('Analyzing supplier offers:', offers.length);

  if (offers.length === 0) {
    return {
      success: false,
      error: 'Нет предложений для анализа'
    };
  }

  // Группируем предложения по материалам
  const materialAnalysis = analyzeMaterialOffers(offers);
  
  // Генерируем сравнительный анализ с помощью ИИ
  const comparison = await generateOffersComparison(materialAnalysis);
  
  // Определяем лучшие предложения
  const recommendations = generatePurchaseRecommendations(materialAnalysis);

  return {
    success: true,
    total_offers: offers.length,
    materials_analyzed: Object.keys(materialAnalysis).length,
    material_analysis: materialAnalysis,
    comparison: comparison,
    recommendations: recommendations,
    best_deals: findBestDeals(materialAnalysis)
  };
}

// Генерация рекомендаций поставщиков
async function generateSupplierRecommendations(categories: string[], existingSuppliers: any[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    return generateDefaultSupplierRecommendations(categories, existingSuppliers);
  }

  const systemPrompt = `Ты - эксперт по поставщикам материалов для ландшафтного дизайна.
На основе запрошенных категорий и существующих поставщиков дай рекомендации по поиску новых поставщиков.

РЕКОМЕНДАЦИИ ДОЛЖНЫ ВКЛЮЧАТЬ:
1. Типы поставщиков для поиска
2. Где их искать (строительные базы, производители, оптовики)
3. На что обратить внимание при выборе
4. Вопросы для переговоров`;

  const userPrompt = `
КАТЕГОРИИ МАТЕРИАЛОВ: ${categories.join(', ')}

СУЩЕСТВУЮЩИЕ ПОСТАВЩИКИ:
${existingSuppliers.map(s => `${s.name} - ${s.categories.join(', ')} (рейтинг: ${s.rating})`).join('\n')}

Дай рекомендации по поиску поставщиков.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    return {
      ai_recommendations: data.choices[0].message.content,
      search_suggestions: generateSearchSuggestions(categories),
      missing_categories: findMissingCategories(categories, existingSuppliers)
    };
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return generateDefaultSupplierRecommendations(categories, existingSuppliers);
  }
}

// Генерация запроса цен
async function generatePriceRequest(request: any, supplier: any) {
  const materials = request.materials || [];
  
  return `Добрый день, ${supplier.contact_person || supplier.name}!

Обращаемся к Вам с запросом цен на следующие материалы:

${materials.map((material: any, index: number) => 
  `${index + 1}. ${material.name} - ${material.quantity || 'по запросу'} ${material.unit || 'шт'}`
).join('\n')}

${request.project_description ? `\nДля проекта: ${request.project_description}` : ''}
${request.delivery_address ? `\nАдрес доставки: ${request.delivery_address}` : ''}
${request.timeline ? `\nСроки поставки: ${request.timeline}` : ''}

Просим предоставить:
- Цены с НДС и без НДС
- Условия оплаты
- Сроки поставки
- Минимальную партию заказа

Ждем Ваше предложение в ближайшее время.

С уважением,
Отдел закупок`;
}

// Имитация отправки запроса цен
async function simulatePriceRequestSending(supplier: any, content: string, request: any): Promise<boolean> {
  console.log('Sending price request to:', supplier.name);
  console.log('Contact method:', supplier.email ? 'email' : 'phone');
  
  // В реальной системе здесь будет отправка email или создание задачи для звонка
  return true;
}

// Анализ предложений по материалам
function analyzeMaterialOffers(offers: any[]) {
  const materialMap: { [key: string]: any[] } = {};
  
  offers.forEach(offer => {
    offer.items?.forEach((item: any) => {
      if (!materialMap[item.material_name]) {
        materialMap[item.material_name] = [];
      }
      
      materialMap[item.material_name].push({
        supplier_name: offer.supplier_name,
        supplier_id: offer.supplier_id,
        price: item.price,
        unit: item.unit,
        min_quantity: item.min_quantity,
        delivery_time: item.delivery_time,
        payment_terms: offer.payment_terms,
        received_at: offer.received_at
      });
    });
  });

  // Сортируем предложения по цене для каждого материала
  Object.keys(materialMap).forEach(material => {
    materialMap[material].sort((a, b) => a.price - b.price);
  });

  return materialMap;
}

// Генерация сравнительного анализа
async function generateOffersComparison(materialAnalysis: any) {
  const comparison = {
    total_materials: Object.keys(materialAnalysis).length,
    supplier_count: new Set(
      Object.values(materialAnalysis).flat().map((offer: any) => offer.supplier_id)
    ).size,
    price_ranges: {} as Record<string, any>,
    best_prices: {} as Record<string, any>,
    delivery_analysis: {} as Record<string, any>
  };

  Object.entries(materialAnalysis).forEach(([material, offers]: [string, any]) => {
    const prices = offers.map((o: any) => o.price);
    comparison.price_ranges[material] = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a: number, b: number) => a + b, 0) / prices.length,
      spread_percent: ((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices) * 100).toFixed(1)
    };

    comparison.best_prices[material] = offers[0]; // Уже отсортированы по цене
  });

  return comparison;
}

// Генерация рекомендаций по закупкам
function generatePurchaseRecommendations(materialAnalysis: any) {
  const recommendations: any[] = [];

  Object.entries(materialAnalysis).forEach(([material, offers]: [string, any]) => {
    if (offers.length > 1) {
      const bestOffer = offers[0];
      const savings = offers[1].price - bestOffer.price;
      
      recommendations.push({
        material,
        recommendation: `Лучшее предложение от ${bestOffer.supplier_name}`,
        savings: savings > 0 ? `Экономия ${savings}₽ за единицу` : null,
        price: bestOffer.price,
        supplier: bestOffer.supplier_name
      });
    }
  });

  return recommendations;
}

// Поиск лучших предложений
function findBestDeals(materialAnalysis: any) {
  return Object.entries(materialAnalysis).map(([material, offers]: [string, any]) => ({
    material,
    best_offer: offers[0],
    alternatives_count: offers.length - 1
  }));
}

// Вспомогательные функции
function generateDefaultSupplierRecommendations(categories: string[], existingSuppliers: any[]) {
  return {
    search_suggestions: generateSearchSuggestions(categories),
    missing_categories: findMissingCategories(categories, existingSuppliers),
    general_advice: 'Рекомендуется найти 2-3 поставщика для каждой категории материалов'
  };
}

function generateSearchSuggestions(categories: string[]) {
  const suggestions: { [key: string]: string[] } = {
    'камень': ['Карьеры', 'Камнеобрабатывающие заводы', 'Строительные базы'],
    'растения': ['Питомники', 'Садовые центры', 'Оптовые поставщики растений'],
    'инструмент': ['Специализированные магазины', 'Дилеры производителей'],
    'удобрения': ['Агромагазины', 'Химические заводы', 'Сельхозпоставщики']
  };

  const result: { [key: string]: string[] } = {};
  categories.forEach(category => {
    const key = Object.keys(suggestions).find(k => 
      category.toLowerCase().includes(k) || k.includes(category.toLowerCase())
    );
    if (key) {
      result[category] = suggestions[key];
    } else {
      result[category] = ['Строительные базы', 'Специализированные поставщики', 'Производители'];
    }
  });

  return result;
}

function findMissingCategories(requestedCategories: string[], existingSuppliers: any[]) {
  const existingCategories = new Set(
    existingSuppliers.flatMap(s => s.categories.map((c: string) => c.toLowerCase()))
  );

  return requestedCategories.filter(category => 
    !Array.from(existingCategories).some(existing => 
      existing.includes(category.toLowerCase()) || category.toLowerCase().includes(existing)
    )
  );
}

async function logSupplierRequest(userId: string, supplierId: string, action: string, details: any) {
  await supabase.from('voice_command_history').insert({
    user_id: userId,
    transcript: `Действие с поставщиком: ${action}`,
    status: 'completed',
    actions: [{ 
      type: 'supplier_action',
      supplier_id: supplierId,
      action,
      details 
    }]
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log('AI Supplier Manager request:', { action });

    // Аутентификация
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user.user) {
      throw new Error('Authentication failed');
    }

    const userId = user.user.id;
    let result;

    switch (action) {
      case 'find_suppliers':
        result = await findSuppliers(data.categories, userId);
        break;
        
      case 'request_prices':
        result = await requestPrices(data.supplier_requests, userId);
        break;
        
      case 'analyze_offers':
        result = await analyzeOffers(data.offers, userId);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-supplier-manager function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
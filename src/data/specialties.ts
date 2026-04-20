import { demoCards } from "./cards";

export interface Specialty {
  id: string;
  name: string;
}

export interface AccreditationCategory {
  id: string;
  name: string;
  description: string;
  specialties: Specialty[];
}

export const accreditationCategories: AccreditationCategory[] = [
  {
    id: "ordinatura",
    name: "Первичная специализированная аккредитация (ординатура, ДПО)",
    description:
      "Для студентов, уже окончивших ординатуру по узкой специальности, а также для врачей, прошедших профессиональную переподготовку",
    specialties: [
      { id: "akusherstvo-ginekologiya", name: "Акушерство и гинекология" },
      { id: "allergologiya", name: "Аллергология" },
      { id: "anesteziologiya-reanimatologiya", name: "Анестезиология-реаниматология" },
      { id: "gastroenterologiya", name: "Гастроэнтерология" },
      { id: "gematologiya", name: "Гематология" },
      { id: "genetika", name: "Генетика" },
      { id: "geriatriya", name: "Гериатрия" },
      { id: "ginekologiya", name: "Гинекология" },
      { id: "dermatologiya", name: "Дерматология" },
      { id: "dermatovenerologiya", name: "Дерматовенерология" },
      { id: "detskaya-hirurgiya", name: "Детская хирургия" },
      { id: "detskaya-nevrologiya", name: "Детская неврология" },
      { id: "detskaya-kardiologiya", name: "Детская кардиология" },
      { id: "detskaya-endokrinologiya", name: "Детская эндокринология" },
      { id: "dietologiya", name: "Диетология" },
      { id: "infektsionnye-bolezni", name: "Инфекционные болезни" },
      { id: "kardiologiya", name: "Кардиология" },
      { id: "klinicheskaya-laboratornaya-diagnostika", name: "Клиническая лабораторная диагностика" },
      { id: "klinicheskaya-farmakologiya", name: "Клиническая фармакология" },
      { id: "koloproktologiya", name: "Колопроктология" },
      { id: "luchevaya-diagnostika", name: "Лучевая диагностика" },
      { id: "luchevaya-terapiya", name: "Лучевая терапия" },
      { id: "manualnaya-terapiya", name: "Мануальная терапия" },
      { id: "neyrohirurgiya", name: "Нейрохирургия" },
      { id: "neonatologiya", name: "Неонатология" },
      { id: "nevrologiya", name: "Неврология" },
      { id: "nefrologiya", name: "Нефрология" },
      { id: "obshchaya-vrachebnaya-praktika", name: "Общая врачебная практика" },
      { id: "onkologiya", name: "Онкология" },
      { id: "ortodontiya", name: "Ортодонтия" },
      { id: "oftalmologiya", name: "Офтальмология" },
      { id: "otorinolaringologiya", name: "Оториноларингология (ЛОР)" },
      { id: "patologicheskaya-anatomiya", name: "Патологическая анатомия" },
      { id: "plasticheskaya-hirurgiya", name: "Пластическая хирургия" },
      { id: "profpatologiya", name: "Профпатология" },
      { id: "psihiatriya", name: "Психиатрия" },
      { id: "psihiatriya-narkologiya", name: "Психиатрия-наркология" },
      { id: "pulmonologiya", name: "Пульмонология" },
      { id: "radiologiya", name: "Радиология" },
      { id: "revmatologiya", name: "Ревматология" },
      { id: "rentgenologiya", name: "Рентгенология" },
      { id: "serdechno-sosudistaya-hirurgiya", name: "Сердечно-сосудистая хирургия" },
      { id: "skoraya-pomoshch", name: "Скорая медицинская помощь" },
      { id: "sportivnaya-medicina", name: "Спортивная медицина" },
      { id: "stomatologiya", name: "Стоматология (ординатура)" },
      { id: "sudebno-meditsinskaya-ekspertiza", name: "Судебно-медицинская экспертиза" },
      { id: "terapiya", name: "Терапия" },
      { id: "toksikologiya", name: "Токсикология" },
      { id: "torakalnaya-hirurgiya", name: "Торакальная хирургия" },
      { id: "transfuziologiya", name: "Трансфузиология" },
      { id: "travmatologiya", name: "Травматология" },
      { id: "ultrazvukovaya-diagnostika", name: "Ультразвуковая диагностика" },
      { id: "urologiya", name: "Урология" },
      { id: "fizioterapiya", name: "Физиотерапия" },
      { id: "ftiziatriya", name: "Фтизиатрия" },
      { id: "funktsionalnaya-diagnostika", name: "Функциональная диагностика" },
      { id: "hirurgiya", name: "Хирургия" },
      { id: "chelyustno-litsevaya-hirurgiya", name: "Челюстно-лицевая хирургия" },
      { id: "endokrinologiya", name: "Эндокринология" },
      { id: "endoskopiya", name: "Эндоскопия" },
    ],
  },
  {
    id: "specialitet",
    name: "Первичная аккредитация (специалитет)",
    description:
      "Для выпускников медицинских вузов",
    specialties: [
      { id: "lechebnoe-delo", name: "Лечебное дело" },
      { id: "pediatriya", name: "Педиатрия" },
      { id: "stomatologiya-spec", name: "Стоматология (специалитет)" },
      { id: "farmaciya", name: "Фармация" },
      { id: "medprofilaktika", name: "Медико-профилактическое дело" },
      { id: "meditsinskaya-biohimiya", name: "Медицинская биохимия" },
      { id: "meditsinskaya-biofizika", name: "Медицинская биофизика" },
      { id: "meditsinskaya-kibernetika", name: "Медицинская кибернетика" },
      { id: "sestrinskoe-delo", name: "Сестринское дело" },
    ],
  },
  {
    id: "spo-special",
    name: "Первичная специализированная аккредитация (СПО)",
    description:
      "Для выпускников среднего профессионального образования, получивших узконаправленную специализацию",
    specialties: [],
  },
  {
    id: "spo-primary",
    name: "Первичная аккредитация (СПО)",
    description:
      "Для выпускников среднего профессионального образования",
    specialties: [],
  },
  {
    id: "profperepodgotovka",
    name: "Высшее образование - переподготовка",
    description:
      "Раздел предназначен для специалистов, окончивших программу профессиональной переподготовки",
    specialties: [],
  },
  {
    id: "non-medical",
    name: "Первичная специализированная аккредитация (немедицинское образование)",
    description:
      "Для лиц с немедицинским высшим образованием, прошедших профессиональную переподготовку",
    specialties: [],
  },
  {
    id: "preliminary",
    name: "Предварительный этап аккредитации",
    description:
      "Для иностранных граждан и лиц, получивших образование в иностранных учреждениях",
    specialties: [],
  },
  {
    id: "accreditation-2018",
    name: "Аккредитация 2018",
    description:
      "Тесты из файлов ФМЗА последних лет. Некоторые ВУЗы используют их для проведения госэкзаменов",
    specialties: [],
  },
  {
    id: "vuz-tests",
    name: "Тесты ВУЗов",
    description: "Внутренние тестовые базы медицинских вузов",
    specialties: [],
  },
];

// Все специальности плоским списком
export const allSpecialties: Specialty[] = accreditationCategories.flatMap(
  (cat) => cat.specialties
);

// Количество карточек ленты для специальности
export function getCardCount(specialtyName: string): number {
  return demoCards.filter((c) => c.specialty === specialtyName).length;
}

// Проверка доступности (есть контент)
export function isSpecialtyAvailable(specialtyName: string): boolean {
  return getCardCount(specialtyName) > 0;
}

// Найти специальность по id
export function findSpecialtyById(id: string): Specialty | undefined {
  return allSpecialties.find((s) => s.id === id);
}

/**
 * Короткое имя категории для отображения над названием специальности
 * в хлебной крошке-чипе: «ОРДИНАТУРА · Гастроэнтерология».
 */
const CATEGORY_SHORT_NAMES: Record<string, string> = {
  ordinatura: "Ординатура",
  specialitet: "Специалитет",
  "spo-special": "СПО специализированная",
  "spo-primary": "СПО",
  profperepodgotovka: "Переподготовка",
};

export function findCategoryBySpecialtyId(
  specialtyId: string
): { id: string; shortName: string } | null {
  for (const cat of accreditationCategories) {
    if (cat.specialties.some((s) => s.id === specialtyId)) {
      return {
        id: cat.id,
        shortName: CATEGORY_SHORT_NAMES[cat.id] || cat.name,
      };
    }
  }
  return null;
}

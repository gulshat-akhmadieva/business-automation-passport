"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "businessAutomationPassportForm";
  const DOCUMENT_KEY = "businessAutomationPassportNumber";
  const TOTAL_STEPS = 5;

  const form = document.getElementById("diagnosisForm");
  const formSteps = [...document.querySelectorAll(".form-step")];
  const stepIndicators = [...document.querySelectorAll("[data-step-indicator]")];

  const progressBar = document.getElementById("progressBar");
  const progressPercent = document.getElementById("progressPercent");
  const progressTrack = document.querySelector(".progress-track");

  const diagnosisSection = document.getElementById("diagnosis");
  const resultsSection = document.getElementById("results");

  const startDiagnosisButton = document.getElementById(
    "startDiagnosisButton"
  );

  const clearSavedDataButton = document.getElementById(
    "clearSavedDataButton"
  );

  const copyPassportButton = document.getElementById(
    "copyPassportButton"
  );

  const downloadPassportButton = document.getElementById(
    "downloadPassportButton"
  );

  const printPassportButton = document.getElementById(
    "printPassportButton"
  );

  const restartDiagnosisButton = document.getElementById(
    "restartDiagnosisButton"
  );

  const toast = document.getElementById("toast");

  let currentStep = 1;
  let currentPassportText = "";
  let toastTimer = null;

  const frequencySettings = {
    several_per_day: {
      label: "несколько раз в день",
      monthlyExecutions: 66
    },
    daily: {
      label: "ежедневно",
      monthlyExecutions: 22
    },
    several_per_week: {
      label: "несколько раз в неделю",
      monthlyExecutions: 12
    },
    weekly: {
      label: "еженедельно",
      monthlyExecutions: 4
    },
    several_per_month: {
      label: "несколько раз в месяц",
      monthlyExecutions: 3
    },
    monthly: {
      label: "ежемесячно",
      monthlyExecutions: 1
    }
  };

  initialiseDocumentData();
  restoreFormData();
  attachEventListeners();
  showStep(currentStep, false);

  function attachEventListeners() {
    startDiagnosisButton.addEventListener("click", () => {
      diagnosisSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    document.querySelectorAll(".next-step").forEach((button) => {
      button.addEventListener("click", () => {
        if (!validateStep(currentStep)) {
          showToast("Проверьте обязательные поля текущего раздела.");
          return;
        }

        showStep(currentStep + 1);
      });
    });

    document.querySelectorAll(".previous-step").forEach((button) => {
      button.addEventListener("click", () => {
        showStep(currentStep - 1);
      });
    });

    form.addEventListener("input", (event) => {
      clearFieldError(event.target);
      saveFormData();
    });

    form.addEventListener("change", (event) => {
      clearFieldError(event.target);
      updateChoiceCardState(event.target);
      saveFormData();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!validateStep(currentStep)) {
        showToast("Заполните обязательные поля перед формированием паспорта.");
        return;
      }

      const data = collectFormData();
      const analysis = analyseProcess(data);

      renderPassport(data, analysis);
      currentPassportText = buildMarkdownPassport(data, analysis);

      resultsSection.hidden = false;

      resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      showToast("Паспорт автоматизации сформирован.");
    });

    clearSavedDataButton.addEventListener("click", () => {
      const shouldClear = window.confirm(
        "Удалить все сохранённые ответы и очистить форму?"
      );

      if (!shouldClear) {
        return;
      }

      clearAllData();
      showToast("Сохранённые ответы удалены.");
    });

    copyPassportButton.addEventListener("click", async () => {
      if (!currentPassportText) {
        showToast("Сначала сформируйте паспорт.");
        return;
      }

      const copied = await copyText(currentPassportText);

      showToast(
        copied
          ? "Паспорт скопирован в буфер обмена."
          : "Не удалось скопировать текст."
      );
    });

    downloadPassportButton.addEventListener("click", () => {
      if (!currentPassportText) {
        showToast("Сначала сформируйте паспорт.");
        return;
      }

      downloadMarkdown(currentPassportText);
      showToast("Файл с паспортом подготовлен.");
    });

    printPassportButton.addEventListener("click", () => {
      window.print();
    });

    restartDiagnosisButton.addEventListener("click", () => {
      resultsSection.hidden = true;
      showStep(1);

      diagnosisSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function initialiseDocumentData() {
    const date = new Date();
    const formattedDate = new Intl.DateTimeFormat("ru-RU").format(date);

    let documentNumber = localStorage.getItem(DOCUMENT_KEY);

    if (!documentNumber) {
      documentNumber = createDocumentNumber(date);
      localStorage.setItem(DOCUMENT_KEY, documentNumber);
    }

    setText("previewDate", formattedDate);
    setText("previewDocumentNumber", documentNumber);
    setText("resultDate", formattedDate);
    setText("resultDocumentNumber", documentNumber);
  }

  function createDocumentNumber(date) {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const randomPart = String(
      Math.floor(1000 + Math.random() * 9000)
    );

    return `${year}${month}${day}-${randomPart}`;
  }

  function showStep(stepNumber, shouldScroll = true) {
    const safeStep = Math.min(
      Math.max(stepNumber, 1),
      TOTAL_STEPS
    );

    currentStep = safeStep;

    formSteps.forEach((step) => {
      const stepValue = Number(step.dataset.step);
      const isActive = stepValue === currentStep;

      step.hidden = !isActive;
      step.classList.toggle("is-active", isActive);
    });

    stepIndicators.forEach((indicator) => {
      const indicatorStep = Number(
        indicator.dataset.stepIndicator
      );

      indicator.classList.toggle(
        "is-active",
        indicatorStep === currentStep
      );

      indicator.classList.toggle(
        "is-complete",
        indicatorStep < currentStep
      );
    });

    const progress = Math.round(
      (currentStep / TOTAL_STEPS) * 100
    );

    progressBar.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;
    progressTrack.setAttribute("aria-valuenow", String(progress));

    saveFormData();

    if (shouldScroll) {
      diagnosisSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function validateStep(stepNumber) {
    const currentSection = form.querySelector(
      `[data-step="${stepNumber}"]`
    );

    if (!currentSection) {
      return true;
    }

    let isValid = true;

    const requiredFields = [
      ...currentSection.querySelectorAll(
        "input[required], select[required], textarea[required]"
      )
    ];

    requiredFields.forEach((field) => {
      const rawValue = String(field.value ?? "").trim();

      let fieldIsValid = rawValue !== "";

      if (
        field.type === "number" &&
        rawValue !== ""
      ) {
        const numericValue = Number(rawValue);
        const minimum = field.min
          ? Number(field.min)
          : null;

        fieldIsValid =
          Number.isFinite(numericValue) &&
          (minimum === null || numericValue >= minimum);
      }

      if (!fieldIsValid) {
        setFieldError(
          field,
          "Заполните это поле."
        );

        isValid = false;
      } else {
        clearFieldError(field);
      }
    });

    if (stepNumber === 3) {
      isValid =
        validateCheckboxGroup(
          "problems",
          "problemsError",
          "Выберите хотя бы одну проблему."
        ) && isValid;
    }

    if (stepNumber === 4) {
      isValid =
        validateCheckboxGroup(
          "systems",
          "systemsError",
          "Выберите хотя бы один источник данных."
        ) && isValid;
    }

    if (stepNumber === 5) {
      isValid =
        validateCheckboxGroup(
          "goals",
          "goalsError",
          "Выберите хотя бы одну цель."
        ) && isValid;
    }

    if (!isValid) {
      const firstInvalidElement =
        currentSection.querySelector(".is-invalid") ||
        currentSection.querySelector(".field-error:not(:empty)");

      firstInvalidElement?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    return isValid;
  }

  function validateCheckboxGroup(
    fieldName,
    errorElementId,
    message
  ) {
    const selected = form.querySelectorAll(
      `input[name="${fieldName}"]:checked`
    );

    const errorElement =
      document.getElementById(errorElementId);

    if (selected.length === 0) {
      errorElement.textContent = message;
      return false;
    }

    errorElement.textContent = "";
    return true;
  }

  function setFieldError(field, message) {
    field.classList.add("is-invalid");

    const errorElement = form.querySelector(
      `[data-error-for="${field.id}"]`
    );

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearFieldError(field) {
    if (!(field instanceof HTMLElement)) {
      return;
    }

    field.classList.remove("is-invalid");

    if (field.id) {
      const errorElement = form.querySelector(
        `[data-error-for="${field.id}"]`
      );

      if (errorElement) {
        errorElement.textContent = "";
      }
    }

    if (
      field instanceof HTMLInputElement &&
      field.type === "checkbox"
    ) {
      const groupErrorMap = {
        problems: "problemsError",
        systems: "systemsError",
        goals: "goalsError"
      };

      const groupErrorId = groupErrorMap[field.name];

      if (groupErrorId) {
        const groupError =
          document.getElementById(groupErrorId);

        if (groupError) {
          groupError.textContent = "";
        }
      }
    }
  }

  function updateChoiceCardState(field) {
    if (
      !(field instanceof HTMLInputElement) ||
      field.type !== "checkbox"
    ) {
      return;
    }

    const card = field.closest(".choice-card");

    if (card) {
      card.classList.toggle(
        "is-selected",
        field.checked
      );
    }
  }

  function collectFormData() {
    return {
      companyName: getValue("companyName"),
      businessSphere: getValue("businessSphere"),
      userRole: getValue("userRole"),
      peopleCount: getNumber("peopleCount", 1),

      processDescription: getValue("processDescription"),
      processOwner: getValue("processOwner"),
      processFrequency: getValue("processFrequency"),
      timePerExecution: getNumber(
        "timePerExecution",
        0
      ),
      timeUnit: getValue("timeUnit"),

      problems: getCheckedValues("problems"),
      errorFrequency: getValue("errorFrequency"),
      humanDependency: getValue("humanDependency"),
      repeatableResult: getValue("repeatableResult"),

      systems: getCheckedValues("systems"),
      singleDataSource: getValue("singleDataSource"),
      resultExamples: getValue("resultExamples"),
      sensitiveData: getValue("sensitiveData"),
      humanApproval: getValue("humanApproval"),

      goals: getCheckedValues("goals"),
      desiredResult: getValue("desiredResult")
    };
  }

  function analyseProcess(data) {
    const workload = calculateMonthlyWorkload(data);
    const potential = calculateAutomationPotential(data);
    const timeSavings = calculateTimeSavings(
      workload,
      potential
    );

    const recommendation =
      determineRecommendedSolution(data);

    return {
      workload,
      potential,
      timeSavings,
      mainTimeLoss: determineMainTimeLoss(data),
      recommendation,
      expectedEffects: buildExpectedEffects(data),
      launchRequirements:
        buildLaunchRequirements(data),
      risks: buildRisks(data),
      mvp: buildMvp(data, recommendation, workload)
    };
  }

  function calculateMonthlyWorkload(data) {
    const frequency =
      frequencySettings[data.processFrequency];

    const monthlyExecutions =
      frequency?.monthlyExecutions ?? 0;

    const timeInHours =
      data.timeUnit === "minutes"
        ? data.timePerExecution / 60
        : data.timePerExecution;

    return (
      timeInHours *
      monthlyExecutions *
      Math.max(data.peopleCount, 1)
    );
  }

  function calculateAutomationPotential(data) {
    let score = 0;

    const frequentProcesses = [
      "several_per_day",
      "daily",
      "several_per_week"
    ];

    if (frequentProcesses.includes(data.processFrequency)) {
      score += 2;
    } else {
      score += 1;
    }

    if (data.repeatableResult === "yes") {
      score += 3;
    }

    if (data.repeatableResult === "partly") {
      score += 1;
    }

    if (data.repeatableResult === "no") {
      score -= 2;
    }

    if (data.humanDependency === "low") {
      score += 3;
    }

    if (data.humanDependency === "medium") {
      score += 1;
    }

    if (data.humanDependency === "high") {
      score -= 2;
    }

    const automationFriendlyProblems = [
      "Ручной перенос данных",
      "Подготовка отчётов",
      "Обработка заявок",
      "Повторяющиеся ответы клиентам",
      "Работа с таблицами",
      "Сверка информации",
      "Поиск данных",
      "Формирование каталогов",
      "Контроль сроков",
      "Аналитика"
    ];

    const relevantProblemCount =
      data.problems.filter((problem) =>
        automationFriendlyProblems.includes(problem)
      ).length;

    score += Math.min(relevantProblemCount, 4);

    if (data.singleDataSource === "yes") {
      score += 1;
    }

    if (data.singleDataSource === "no") {
      score -= 1;
    }

    if (data.resultExamples === "yes") {
      score += 1;
    }

    if (data.resultExamples === "no") {
      score -= 1;
    }

    if (
      data.humanApproval === "yes" &&
      data.humanDependency === "high"
    ) {
      score -= 1;
    }

    if (score >= 8) {
      return {
        level: "Высокий",
        minimumSavingRate: 0.5,
        maximumSavingRate: 0.75,
        description:
          "Процесс регулярно повторяется, содержит стандартизируемые действия и имеет выраженный потенциал для сокращения ручной работы."
      };
    }

    if (score >= 3) {
      return {
        level: "Средний",
        minimumSavingRate: 0.2,
        maximumSavingRate: 0.5,
        description:
          "Часть операций можно автоматизировать, однако отдельные этапы потребуют контроля человека или предварительной подготовки данных."
      };
    }

    return {
      level: "Низкий",
      minimumSavingRate: 0.05,
      maximumSavingRate: 0.2,
      description:
        "Процесс сильно зависит от индивидуальных решений или пока недостаточно стандартизирован. Начинать лучше с отдельного повторяющегося этапа."
    };
  }

  function calculateTimeSavings(workload, potential) {
    return {
      minimum:
        workload * potential.minimumSavingRate,
      maximum:
        workload * potential.maximumSavingRate
    };
  }

  function determineMainTimeLoss(data) {
    const priority = [
      "Ручной перенос данных",
      "Подготовка отчётов",
      "Сверка информации",
      "Поиск данных",
      "Работа с таблицами",
      "Обработка заявок",
      "Повторяющиеся ответы клиентам",
      "Формирование каталогов",
      "Контроль сроков",
      "Работа с документами",
      "Аналитика",
      "Ошибки сотрудников",
      "Потеря информации",
      "Подготовка текстов и материалов",
      "Другое"
    ];

    return (
      priority.find((item) =>
        data.problems.includes(item)
      ) ||
      data.problems[0] ||
      "Повторяющиеся ручные операции"
    );
  }

  function determineRecommendedSolution(data) {
    const scores = {
      "Мини-сервис": 0,
      "Автоматизация процесса": 0,
      "ИИ-ассистент с контролем человека": 0,
      "Система аналитики и отчётности": 0,
      "Комплексное решение с интеграциями": 0
    };

    if (data.goals.includes("Создать мини-сервис")) {
      scores["Мини-сервис"] += 5;
    }

    if (data.repeatableResult === "yes") {
      scores["Мини-сервис"] += 1;
      scores["Автоматизация процесса"] += 2;
    }

    if (
      data.problems.includes("Ручной перенос данных")
    ) {
      scores["Автоматизация процесса"] += 4;
    }

    if (
      data.problems.includes("Обработка заявок")
    ) {
      scores["Автоматизация процесса"] += 3;
    }

    if (
      data.problems.includes("Контроль сроков")
    ) {
      scores["Автоматизация процесса"] += 2;
    }

    if (
      data.problems.includes(
        "Повторяющиеся ответы клиентам"
      )
    ) {
      scores[
        "ИИ-ассистент с контролем человека"
      ] += 4;
    }

    if (
      data.problems.includes("Работа с документами")
    ) {
      scores[
        "ИИ-ассистент с контролем человека"
      ] += 3;
    }

    if (
      data.problems.includes(
        "Подготовка текстов и материалов"
      )
    ) {
      scores[
        "ИИ-ассистент с контролем человека"
      ] += 4;
    }

    if (
      data.problems.includes("Поиск данных")
    ) {
      scores[
        "ИИ-ассистент с контролем человека"
      ] += 2;
    }

    if (
      data.goals.includes("Создать ИИ-ассистента")
    ) {
      scores[
        "ИИ-ассистент с контролем человека"
      ] += 5;
    }

    if (
      data.problems.includes("Подготовка отчётов")
    ) {
      scores[
        "Система аналитики и отчётности"
      ] += 4;
    }

    if (
      data.problems.includes("Работа с таблицами")
    ) {
      scores[
        "Система аналитики и отчётности"
      ] += 3;
    }

    if (data.problems.includes("Аналитика")) {
      scores[
        "Система аналитики и отчётности"
      ] += 4;
    }

    if (
      data.goals.includes(
        "Автоматически формировать отчёты"
      )
    ) {
      scores[
        "Система аналитики и отчётности"
      ] += 5;
    }

    if (data.goals.includes("Объединить данные")) {
      scores[
        "Система аналитики и отчётности"
      ] += 2;

      scores[
        "Комплексное решение с интеграциями"
      ] += 3;
    }

    if (
      data.systems.includes(
        "Несколько разных систем"
      )
    ) {
      scores[
        "Комплексное решение с интеграциями"
      ] += 6;
    }

    if (data.systems.length >= 3) {
      scores[
        "Комплексное решение с интеграциями"
      ] += 3;
    }

    if (data.singleDataSource === "no") {
      scores[
        "Комплексное решение с интеграциями"
      ] += 3;
    }

    if (data.goals.length >= 4) {
      scores[
        "Комплексное решение с интеграциями"
      ] += 2;
    }

    const selectedSolution = Object.entries(scores)
      .sort((first, second) => second[1] - first[1])[0][0];

    const reasons = {
      "Мини-сервис":
        "Подходит для локальной задачи с понятными входными данными и конкретным результатом, которым пользователь сможет пользоваться самостоятельно.",

      "Автоматизация процесса":
        "Подходит для регулярных операций, которые выполняются по повторяемым правилам и требуют сокращения ручных действий.",

      "ИИ-ассистент с контролем человека":
        "Подходит для работы с текстами, документами, ответами или классификацией информации, при этом итог должен проверяться специалистом.",

      "Система аналитики и отчётности":
        "Подходит для сбора, обработки и представления данных, а также для регулярного формирования отчётов и показателей.",

      "Комплексное решение с интеграциями":
        "Подходит, поскольку процесс связан с несколькими источниками данных, этапами или системами и требует согласованной передачи информации."
    };

    return {
      name: selectedSolution,
      reason: reasons[selectedSolution]
    };
  }

  function buildExpectedEffects(data) {
    const effects = [];

    const addEffect = (effect) => {
      if (!effects.includes(effect)) {
        effects.push(effect);
      }
    };

    if (
      data.goals.includes("Сократить ручную работу") ||
      data.problems.includes("Ручной перенос данных")
    ) {
      addEffect(
        "Сокращение повторяющихся ручных операций и количества переносов данных."
      );
    }

    if (
      data.goals.includes("Ускорить обработку заявок") ||
      data.problems.includes("Обработка заявок")
    ) {
      addEffect(
        "Ускорение обработки входящих заявок и передачи информации ответственному сотруднику."
      );
    }

    if (
      data.goals.includes(
        "Автоматически формировать отчёты"
      ) ||
      data.problems.includes("Подготовка отчётов")
    ) {
      addEffect(
        "Более быстрая и регулярная подготовка отчётности без повторного ручного сбора данных."
      );
    }

    if (
      data.goals.includes(
        "Уменьшить количество ошибок"
      ) ||
      data.problems.includes("Ошибки сотрудников")
    ) {
      addEffect(
        "Снижение риска ошибок, связанных с копированием, сверкой и повторным вводом информации."
      );
    }

    if (
      data.goals.includes("Объединить данные") ||
      data.singleDataSource === "no"
    ) {
      addEffect(
        "Формирование более единой и прозрачной структуры данных."
      );
    }

    if (
      data.goals.includes(
        "Улучшить клиентский сервис"
      ) ||
      data.problems.includes(
        "Повторяющиеся ответы клиентам"
      )
    ) {
      addEffect(
        "Более быстрые и последовательные ответы клиентам при сохранении контроля специалиста."
      );
    }

    if (
      data.goals.includes("Автоматизировать документы") ||
      data.problems.includes("Работа с документами")
    ) {
      addEffect(
        "Ускорение подготовки, проверки и структурирования документов."
      );
    }

    if (
      data.goals.includes("Создать систему контроля") ||
      data.problems.includes("Контроль сроков")
    ) {
      addEffect(
        "Повышение прозрачности сроков, статусов и ответственных участников процесса."
      );
    }

    if (effects.length < 3) {
      addEffect(
        "Освобождение части рабочего времени сотрудников для задач, требующих человеческого внимания."
      );
    }

    return effects.slice(0, 6);
  }

  function buildLaunchRequirements(data) {
    const requirements = [
      "Краткая схема текущего процесса по шагам.",
      "Примеры исходных данных, на которых выполняется работа.",
      "Пример результата, который считается правильным.",
      `Описание используемых источников: ${joinReadable(
        data.systems
      )}.`,
      "Ответственный сотрудник, который сможет проверить первую рабочую версию."
    ];

    if (data.resultExamples === "no") {
      requirements.push(
        "Согласованные критерии правильного результата, поскольку готовых примеров пока нет."
      );
    }

    if (data.singleDataSource !== "yes") {
      requirements.push(
        "Перечень мест хранения данных и правила выбора актуальной информации."
      );
    }

    if (data.sensitiveData !== "no") {
      requirements.push(
        "Правила доступа, хранения и обработки конфиденциальной информации."
      );
    }

    return uniqueItems(requirements);
  }

  function buildRisks(data) {
    const risks = [];

    if (data.sensitiveData === "yes") {
      risks.push(
        "В процессе используются персональные или конфиденциальные данные. Перед внедрением необходимо определить требования к доступам, хранению и защите информации."
      );
    }

    if (data.sensitiveData === "possibly") {
      risks.push(
        "Необходимо отдельно проверить, содержит ли процесс персональные или конфиденциальные сведения."
      );
    }

    if (data.singleDataSource === "no") {
      risks.push(
        "Данные находятся в разных системах. До автоматизации потребуется определить единый источник актуальной информации."
      );
    }

    if (data.singleDataSource === "partly") {
      risks.push(
        "Источники данных объединены только частично, поэтому возможны расхождения и дубли."
      );
    }

    if (data.resultExamples === "no") {
      risks.push(
        "Отсутствуют примеры правильного результата. Сначала необходимо зафиксировать критерии качества."
      );
    }

    if (data.humanDependency === "high") {
      risks.push(
        "Результат сильно зависит от экспертного решения человека. Полностью исключать специалиста из процесса нельзя."
      );
    }

    if (data.repeatableResult === "no") {
      risks.push(
        "Каждый случай уникален. Начинать лучше с автоматизации отдельных повторяющихся этапов."
      );
    }

    if (data.humanApproval === "yes") {
      risks.push(
        "Итог должен обязательно подтверждаться человеком до дальнейшего использования."
      );
    }

    if (
      data.systems.includes(
        "Несколько разных систем"
      ) ||
      data.systems.length >= 3
    ) {
      risks.push(
        "Перед разработкой необходимо проверить техническую возможность безопасного обмена данными между используемыми системами."
      );
    }

    risks.push(
      "Фактический эффект зависит от качества исходных данных, стабильности процесса и условий внедрения."
    );

    return uniqueItems(risks);
  }

  function buildMvp(data, recommendation, workload) {
    const humanControlMap = {
      yes:
        "Ответственный сотрудник проверяет каждый результат перед использованием.",
      sometimes:
        "Сотрудник проверяет нестандартные случаи и спорные результаты.",
      no:
        "Ручная проверка может быть выборочной, однако контроль качества на первом этапе сохраняется."
    };

    return {
      goal:
        data.desiredResult ||
        "Сократить ручную работу в выбранном процессе.",

      input:
        `Данные из источников: ${joinReadable(
          data.systems
        )}.`,

      action:
        `${recommendation.name} принимает исходные данные, выполняет повторяющиеся операции по согласованным правилам и подготавливает результат для пользователя.`,

      output:
        data.desiredResult,

      humanControl:
        humanControlMap[data.humanApproval] ||
        "Специалист проверяет результат на первом этапе внедрения.",

      success:
        `Решение считается успешным, если сокращает часть текущих трудозатрат, которые сейчас составляют около ${formatHours(
          workload
        )} в месяц, и сохраняет требуемое качество результата.`
    };
  }

  function renderPassport(data, analysis) {
    setText(
      "automationPotential",
      analysis.potential.level
    );

    setText(
      "automationPotentialDescription",
      analysis.potential.description
    );

    setText(
      "monthlyWorkload",
      formatHours(analysis.workload)
    );

    setText(
      "potentialTimeSavings",
      `${formatHours(
        analysis.timeSavings.minimum
      )}–${formatHours(
        analysis.timeSavings.maximum
      )}`
    );

    setText(
      "resultProcessDescription",
      data.processDescription
    );

    setText(
      "resultBusinessSphere",
      data.businessSphere
    );

    setText(
      "resultProcessOwner",
      data.processOwner
    );

    setText(
      "mainTimeLoss",
      analysis.mainTimeLoss
    );

    setText(
      "recommendedSolution",
      analysis.recommendation.name
    );

    setText(
      "recommendedSolutionReason",
      analysis.recommendation.reason
    );

    renderList(
      "expectedEffects",
      analysis.expectedEffects
    );

    renderList(
      "launchRequirements",
      analysis.launchRequirements
    );

    renderList(
      "riskList",
      analysis.risks
    );

    setText("mvpGoal", analysis.mvp.goal);
    setText("mvpInput", analysis.mvp.input);
    setText("mvpAction", analysis.mvp.action);
    setText("mvpOutput", analysis.mvp.output);

    setText(
      "mvpHumanControl",
      analysis.mvp.humanControl
    );

    setText(
      "mvpSuccess",
      analysis.mvp.success
    );
  }

  function renderList(elementId, items) {
    const list = document.getElementById(elementId);

    list.innerHTML = "";

    items.forEach((item) => {
      const listItem =
        document.createElement("li");

      listItem.textContent = item;
      list.appendChild(listItem);
    });
  }

  function buildMarkdownPassport(data, analysis) {
    const date =
      document.getElementById("resultDate").textContent;

    const number =
      document.getElementById(
        "resultDocumentNumber"
      ).textContent;

    return [
      "# Паспорт автоматизации бизнеса",
      "",
      `**Документ №:** ${number}`,
      `**Дата:** ${date}`,
      `**Компания или проект:** ${
        data.companyName || "Не указано"
      }`,
      `**Сфера деятельности:** ${data.businessSphere}`,
      "",
      "## 1. Диагностируемый процесс",
      "",
      data.processDescription,
      "",
      `- **Исполнитель:** ${data.processOwner}`,
      `- **Количество участников:** ${data.peopleCount}`,
      `- **Частота:** ${
        frequencySettings[
          data.processFrequency
        ]?.label || "Не указано"
      }`,
      `- **Текущие трудозатраты:** ${formatHours(
        analysis.workload
      )} в месяц`,
      `- **Главный источник потерь:** ${analysis.mainTimeLoss}`,
      "",
      "## 2. Потенциал автоматизации",
      "",
      `**${analysis.potential.level}**`,
      "",
      analysis.potential.description,
      "",
      `Ориентировочно можно освободить ${formatHours(
        analysis.timeSavings.minimum
      )}–${formatHours(
        analysis.timeSavings.maximum
      )} в месяц.`,
      "",
      "Оценка является предварительной и зависит от качества данных, правил процесса и условий внедрения.",
      "",
      "## 3. Рекомендуемый формат решения",
      "",
      `**${analysis.recommendation.name}**`,
      "",
      analysis.recommendation.reason,
      "",
      "## 4. Ожидаемый эффект",
      "",
      markdownList(analysis.expectedEffects),
      "",
      "## 5. Что потребуется для запуска",
      "",
      markdownList(
        analysis.launchRequirements
      ),
      "",
      "## 6. Риски и ограничения",
      "",
      markdownList(analysis.risks),
      "",
      "## 7. Черновик первой версии",
      "",
      `- **Цель:** ${analysis.mvp.goal}`,
      `- **Входные данные:** ${analysis.mvp.input}`,
      `- **Что делает решение:** ${analysis.mvp.action}`,
      `- **Результат:** ${analysis.mvp.output}`,
      `- **Контроль человека:** ${analysis.mvp.humanControl}`,
      `- **Критерий успеха:** ${analysis.mvp.success}`,
      "",
      "## Следующий шаг",
      "",
      "Получить индивидуальный разбор задачи и расчёт проекта:",
      "https://t.me/Gulshat_Akhmadieva",
      "",
      "---",
      "",
      "Документ сформирован сервисом предварительной диагностики. Он не является окончательным техническим заданием, гарантией результата или коммерческим предложением."
    ].join("\n");
  }

  function saveFormData() {
    const savedData = {
      currentStep,
      values: {}
    };

    [...form.elements].forEach((element) => {
      if (!element.name) {
        return;
      }

      if (
        element instanceof HTMLInputElement &&
        element.type === "checkbox"
      ) {
        if (!Array.isArray(savedData.values[element.name])) {
          savedData.values[element.name] = [];
        }

        if (element.checked) {
          savedData.values[element.name].push(
            element.value
          );
        }

        return;
      }

      savedData.values[element.name] = element.value;
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(savedData)
    );
  }

  function restoreFormData() {
    const rawData =
      localStorage.getItem(STORAGE_KEY);

    if (!rawData) {
      return;
    }

    try {
      const savedData = JSON.parse(rawData);

      Object.entries(savedData.values || {}).forEach(
        ([name, value]) => {
          const elements = form.querySelectorAll(
            `[name="${name}"]`
          );

          elements.forEach((element) => {
            if (
              element instanceof HTMLInputElement &&
              element.type === "checkbox"
            ) {
              element.checked =
                Array.isArray(value) &&
                value.includes(element.value);

              updateChoiceCardState(element);
              return;
            }

            element.value = value;
          });
        }
      );

      currentStep =
        Number(savedData.currentStep) || 1;
    } catch (error) {
      console.warn(
        "Не удалось восстановить сохранённые данные:",
        error
      );

      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DOCUMENT_KEY);

    form.reset();

    form.querySelectorAll(".is-invalid").forEach(
      (element) => {
        element.classList.remove("is-invalid");
      }
    );

    form.querySelectorAll(".field-error").forEach(
      (element) => {
        element.textContent = "";
      }
    );

    form.querySelectorAll(
      'input[type="checkbox"]'
    ).forEach((checkbox) => {
      updateChoiceCardState(checkbox);
    });

    document.getElementById("peopleCount").value = "1";

    resultsSection.hidden = true;
    currentPassportText = "";

    initialiseDocumentData();
    showStep(1, false);
  }

  async function copyText(text) {
    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const temporaryTextarea =
        document.createElement("textarea");

      temporaryTextarea.value = text;
      temporaryTextarea.style.position = "fixed";
      temporaryTextarea.style.opacity = "0";

      document.body.appendChild(temporaryTextarea);
      temporaryTextarea.focus();
      temporaryTextarea.select();

      const result = document.execCommand("copy");

      temporaryTextarea.remove();

      return result;
    } catch (error) {
      console.error("Ошибка копирования:", error);
      return false;
    }
  }

  function downloadMarkdown(text) {
    const companyName =
      getValue("companyName");

    const baseName = companyName
      ? sanitiseFileName(companyName)
      : "automation-passport";

    const blob = new Blob([text], {
      type: "text/markdown;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${baseName}-automation-passport.md`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function sanitiseFileName(value) {
    const cleaned = value
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    return cleaned || "automation-passport";
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  function getValue(elementId) {
    const element =
      document.getElementById(elementId);

    return String(element?.value ?? "").trim();
  }

  function getNumber(elementId, fallback = 0) {
    const value = Number(getValue(elementId));

    return Number.isFinite(value)
      ? value
      : fallback;
  }

  function getCheckedValues(fieldName) {
    return [
      ...form.querySelectorAll(
        `input[name="${fieldName}"]:checked`
      )
    ].map((element) => element.value);
  }

  function setText(elementId, value) {
    const element =
      document.getElementById(elementId);

    if (element) {
      element.textContent = String(value);
    }
  }

  function formatHours(value) {
    const safeValue =
      Number.isFinite(value) ? value : 0;

    const formatted =
      new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      }).format(safeValue);

    return `${formatted} ч`;
  }

  function joinReadable(items) {
    if (!items.length) {
      return "не указаны";
    }

    if (items.length === 1) {
      return items[0];
    }

    if (items.length === 2) {
      return `${items[0]} и ${items[1]}`;
    }

    return `${items
      .slice(0, -1)
      .join(", ")} и ${items.at(-1)}`;
  }

  function uniqueItems(items) {
    return [...new Set(items)];
  }

  function markdownList(items) {
    return items
      .map((item) => `- ${item}`)
      .join("\n");
  }
});
import { Component, OnInit, Input, ViewChild, Output, EventEmitter, AfterViewInit, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CarouselComponent } from 'ngx-bootstrap/carousel';
import { QumlPlayerConfig } from '../quml-library-interface';
import { ViewerService } from '../services/viewer-service/viewer-service';
import { eventName, TelemetryType, pageId } from '../telemetry-constants';
import { UtilService } from '../util-service';
import { QuestionCursor } from '../quml-question-cursor.service';
import * as _ from 'lodash-es';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'quml-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit, AfterViewInit {
  @Input() QumlPlayerConfig: QumlPlayerConfig;
  @Output() playerEvent = new EventEmitter<any>();
  @Output() telemetryEvent = new EventEmitter<any>();
  @ViewChild('car', { static: false }) car: CarouselComponent;
  destroy$: Subject<boolean> = new Subject<boolean>();

  threshold: number;
  replayed = false;
  questions = [];
  linearNavigation: boolean;
  endPageReached: boolean;
  slideInterval: number;
  showIndicator: Boolean;
  noWrapSlides: Boolean;
  optionSelectedObj: any;
  showAlert: Boolean;
  currentOptions: any;
  currentQuestion: any;
  media: any;
  currentSolutions: any;
  showSolution: any;
  active = false;
  alertType: string;
  previousOption: any;
  timeLimit: any;
  showTimer: any;
  showFeedBack: boolean;
  showUserSolution: boolean;
  startPageInstruction: string;
  shuffleQuestions: boolean;
  requiresSubmit: boolean;
  noOfQuestions: number;
  maxScore: number;
  points: number;
  initialTime: number;
  initializeTimer: boolean;
  durationSpent: string;
  userName: string;
  contentName: string;
  currentSlideIndex = 0;
  attemptedQuestions = [];
  loadScoreBoard = false;
  totalScore = [];
  private intervalRef: any;
  public finalScore = 0;
  progressBarClass = [];
  currentScore
  maxQuestions: number;
  allowSkip: boolean;
  infoPopup: boolean;
  loadView: Boolean;
  noOfTimesApiCalled: number = 0;
  currentOptionSelected: string;
  questionIds: Array<[]>;
  questionIdsCopy: Array<[]>;
  CarouselConfig = {
    NEXT: 1,
    PREV: 2
  };
  sideMenuConfig = {
    showShare: true,
    showDownload: true,
    showReplay: false,
    showExit: true,
  };
  warningTime: number;
  showQuestions = false;
  showStartPage = true;
  showEndPage = true;
  showZoomModal = false;
  zoomImgSrc: string;
  modalImageWidth = 0;
  disableNext: boolean;
  currentQuestionsMedia;

  constructor(
    public viewerService: ViewerService,
    public utilService: UtilService,
    public questionCursor: QuestionCursor,
    private element: ElementRef,
    private cdRef: ChangeDetectorRef
  ) {
    this.endPageReached = false;
    this.viewerService.qumlPlayerEvent.asObservable()
    .pipe(takeUntil(this.destroy$))
    .subscribe((res) => {
      this.playerEvent.emit(res);
    });

    this.viewerService.qumlQuestionEvent
    .pipe(takeUntil(this.destroy$))
    .subscribe((res) => {

      if (res && !res.questions) {
        return;
      }

      this.questions = _.uniqBy(this.questions.concat(res.questions), 'identifier');
      this.cdRef.detectChanges();
      this.noOfTimesApiCalled++;
      this.loadView = true;
      this.showQuestions = true;
      if (this.currentSlideIndex > 0) {
        this.car.selectSlide(this.currentSlideIndex);
      }

      if (this.showStartPage === false && this.currentSlideIndex === 0) {
        setTimeout(() => { this.nextSlide() });
      }

    })
  }

  @HostListener('document:TelemetryEvent', ['$event'])
  onTelemetryEvent(event) {
    this.telemetryEvent.emit(event.detail);
  }

  ngOnInit() {
    this.sideMenuConfig = { ...this.sideMenuConfig, ...this.QumlPlayerConfig.config.sideMenu };
    this.threshold = this.QumlPlayerConfig.context.threshold || 3;
    this.questionIds = this.QumlPlayerConfig.metadata.childNodes;
    this.shuffleQuestions = this.QumlPlayerConfig.metadata.shuffle ? this.QumlPlayerConfig.metadata.shuffle : false;
    if (this.shuffleQuestions) {
      this.questionIds = _.shuffle(this.questionIds);
    }
    this.questionIdsCopy = _.cloneDeep(this.QumlPlayerConfig.metadata.childNodes);
    this.maxQuestions = this.QumlPlayerConfig.metadata.maxQuestions;
    if (this.maxQuestions) {
      this.questionIds = this.questionIds.slice(0, this.maxQuestions);
      this.questionIdsCopy = this.questionIdsCopy.slice(0, this.maxQuestions);
    }
    this.noOfQuestions = this.questionIds.length;
    this.viewerService.initialize(this.QumlPlayerConfig, this.threshold, this.questionIds);
    this.initialTime = new Date().getTime();
    this.slideInterval = 0;
    this.showIndicator = false;
    this.noWrapSlides = true;
    if (_.get(this.QumlPlayerConfig, 'metadata.timeLimits') && typeof _.get(this.QumlPlayerConfig, 'metadata.timeLimits') === 'string') {
      this.QumlPlayerConfig.metadata.timeLimits = JSON.parse(this.QumlPlayerConfig.metadata.timeLimits);
    }
    this.timeLimit = this.QumlPlayerConfig.metadata.timeLimits && this.QumlPlayerConfig.metadata.timeLimits.maxTime ? this.QumlPlayerConfig.metadata.timeLimits.maxTime : 0;
    this.warningTime = this.QumlPlayerConfig.metadata.timeLimits && this.QumlPlayerConfig.metadata.timeLimits.warningTime ? this.QumlPlayerConfig.metadata.timeLimits.warningTime : 0;
    this.showTimer = this.QumlPlayerConfig.metadata.showTimer.toLowerCase() === 'no' ? false : true;
    this.showFeedBack = this.QumlPlayerConfig.metadata.showFeedback.toLowerCase() === 'no' ? false : true;
    this.showUserSolution = this.QumlPlayerConfig.metadata.showSolutions.toLowerCase() === 'no' ? false : true;
    this.startPageInstruction = _.get(this.QumlPlayerConfig, 'metadata.instructions.default');
    this.linearNavigation = this.QumlPlayerConfig.metadata.navigationMode === 'non-linear' ? false : true;
    this.requiresSubmit = this.QumlPlayerConfig.metadata.requiresSubmit.toLowerCase() === 'no' ? false : true;
    this.maxScore = this.QumlPlayerConfig.metadata.maxScore;
    this.points = this.QumlPlayerConfig.metadata.points;
    this.userName = this.QumlPlayerConfig.context.userData.firstName + ' ' + this.QumlPlayerConfig.context.userData.lastName;
    this.contentName = this.QumlPlayerConfig.metadata.name;
    this.allowSkip = this.QumlPlayerConfig.metadata.allowSkip;
    this.showStartPage = this.QumlPlayerConfig.metadata.showStartPage && this.QumlPlayerConfig.metadata.showStartPage.toLowerCase() === 'no' ? false : true
    this.showEndPage = this.QumlPlayerConfig.metadata.showEndPage && this.QumlPlayerConfig.metadata.showEndPage.toLowerCase() === 'no' ? false : true

    this.setInitialScores();
    if (this.threshold === 1) {
      this.viewerService.getQuestion();
    } else if (this.threshold > 1) {
      this.viewerService.getQuestions();
    }
  }

  ngAfterViewInit() {
    this.viewerService.raiseStartEvent(0);
    this.viewerService.raiseHeartBeatEvent(eventName.startPageLoaded, 'impression', 0);
  }

  nextSlide() {
    this.currentQuestionsMedia = _.get(this.questions[this.currentSlideIndex], 'media');
    this.setImageZoom(_.get(this.questions[this.currentSlideIndex], 'identifier'));
    if (this.car.getCurrentSlideIndex() > 0 && ((this.threshold * this.noOfTimesApiCalled) - 1) === this.car.getCurrentSlideIndex()
      && this.threshold * this.noOfTimesApiCalled >= this.questions.length && this.threshold > 1) {
      this.viewerService.getQuestions();
    }

    if (this.car.getCurrentSlideIndex() > 0 && this.questions[this.car.getCurrentSlideIndex()] === undefined && this.threshold > 1) {
      this.viewerService.getQuestions();
    }

    if (this.threshold === 1 && this.car.getCurrentSlideIndex() >= 0) {
      this.viewerService.getQuestion();
    }
    this.viewerService.raiseHeartBeatEvent(eventName.nextClicked, TelemetryType.interact, this.car.getCurrentSlideIndex() + 1);
    this.viewerService.raiseHeartBeatEvent(eventName.nextClicked, TelemetryType.impression, this.car.getCurrentSlideIndex() + 1);

    if (this.loadScoreBoard) {
      this.endPageReached = true;
      this.viewerService.raiseEndEvent(this.car.getCurrentSlideIndex(), this.car.getCurrentSlideIndex() - 1, this.endPageReached, this.finalScore);
    }
    if (this.currentSlideIndex !== this.questions.length) {
      this.currentSlideIndex = this.currentSlideIndex + 1;
    }
    if (this.car.getCurrentSlideIndex() === 0) {
      this.initializeTimer = true;
    }
    if (this.car.getCurrentSlideIndex() === this.noOfQuestions && this.requiresSubmit) {
      this.loadScoreBoard = true;
      this.disableNext = true;
    }
    if (this.car.getCurrentSlideIndex() === this.noOfQuestions) {
      this.durationSpent = this.utilService.getTimeSpentText(this.initialTime);

      if (!this.requiresSubmit && this.showEndPage) {
        this.endPageReached = true;
        this.viewerService.raiseEndEvent(this.car.getCurrentSlideIndex(), this.car.getCurrentSlideIndex() - 1, this.endPageReached, this.finalScore);
      }
    }
    if (this.car.isLast(this.car.getCurrentSlideIndex()) || this.noOfQuestions === this.car.getCurrentSlideIndex()) {
      this.calculateScore();
    }

    if (this.car.getCurrentSlideIndex() > 0 && !this.loadScoreBoard && this.questions[this.car.getCurrentSlideIndex() - 1].qType === 'MCQ' && this.currentOptionSelected) {
      const option = this.currentOptionSelected && this.currentOptionSelected['option'] ? this.currentOptionSelected['option'] : undefined
      const identifier = this.questions[this.car.getCurrentSlideIndex() - 1].identifier;
      const qType = this.questions[this.car.getCurrentSlideIndex() - 1].qType;
      this.viewerService.raiseResponseEvent(identifier, qType, option);
    }
    this.car.move(this.CarouselConfig.NEXT);
    this.active = false;
    this.showAlert = false;
    this.optionSelectedObj = undefined;
    this.currentOptionSelected = undefined;
    this.currentQuestion = undefined;
    this.currentOptions = undefined;
    this.currentSolutions = undefined;
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  prevSlide() {
    this.disableNext = false;
    this.viewerService.raiseHeartBeatEvent(eventName.prevClicked, TelemetryType.interact, this.car.getCurrentSlideIndex() - 1);
    this.showAlert = false;
    if (this.car.getCurrentSlideIndex() + 1 === this.noOfQuestions && this.endPageReached) {
      this.endPageReached = false;
    } else if (!this.loadScoreBoard) {
      this.car.move(this.CarouselConfig.PREV);
    } else if (!this.linearNavigation && this.loadScoreBoard) {
      this.car.selectSlide(this.noOfQuestions);
      this.loadScoreBoard = false;
    }
    this.currentQuestionsMedia = _.get(this.questions[this.car.getCurrentSlideIndex() - 1], 'media');
    this.setImageZoom(_.get(this.questions[this.car.getCurrentSlideIndex() - 1], 'identifier'));
  }

  sideBarEvents(event) {
    this.viewerService.raiseHeartBeatEvent(event, TelemetryType.interact, this.car.getCurrentSlideIndex() + 1);
  }


  getOptionSelected(optionSelected) {
    this.active = true;
    this.currentOptionSelected = optionSelected
    const currentIndex = this.car.getCurrentSlideIndex() - 1;
    let key: any = this.utilService.getKeyValue(Object.keys(this.questions[currentIndex].responseDeclaration));
    const questionObj = {
      question: this.questions[currentIndex].body,
      option: this.questions[currentIndex].interactions[key].options,
      selectedOption: optionSelected.option
    }
    this.viewerService.raiseHeartBeatEvent(eventName.optionClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.optionSelectedObj = optionSelected;
    this.currentSolutions = optionSelected.solutions;
    this.media = this.questions[this.car.getCurrentSlideIndex() - 1].media;
    if (this.currentSolutions) {
      this.currentSolutions.forEach((ele, index) => {
        if (ele.type === 'video') {
          this.media.forEach((e) => {
            if (e.id === this.currentSolutions[index].value) {
              this.currentSolutions[index].type = 'video'
              this.currentSolutions[index].src = e.src;
              this.currentSolutions[index].thumbnail = e.thumbnail;
            }
          })
        }
      })
    }
    this.validateSelectedOption(this.optionSelectedObj);
  }

  closeAlertBox(event) {
    if (event.type === 'close') {
      this.viewerService.raiseHeartBeatEvent(eventName.closedFeedBack, TelemetryType.interact, this.car.getCurrentSlideIndex());
    } else if (event.type === 'tryAgain') {
      this.viewerService.raiseHeartBeatEvent(eventName.tryAgain, TelemetryType.interact, this.car.getCurrentSlideIndex());
    }
    this.showAlert = false;
  }

  viewSolution() {
    this.viewerService.raiseHeartBeatEvent(eventName.viewSolutionClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.showSolution = true;
    this.showAlert = false;
    this.currentQuestionsMedia = _.get(this.questions[this.car.getCurrentSlideIndex()], 'media');
    _.forEach(this.currentOptions, (val, key) => {
      this.setImageZoom(String(key));
    });
    clearTimeout(this.intervalRef);
  }

  exitContent(event) {
    this.calculateScore();
    if (event.type === 'EXIT') {
      this.viewerService.raiseHeartBeatEvent(eventName.endPageExitClicked, TelemetryType.interact, 'endPage')
      this.viewerService.raiseEndEvent(this.car.getCurrentSlideIndex(), this.car.getCurrentSlideIndex() - 1, 'endPage', this.finalScore);
    }
  }

  closeSolution() {
    this.viewerService.raiseHeartBeatEvent(eventName.solutionClosed, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.showSolution = false;
    this.car.selectSlide(this.currentSlideIndex);
  }

  durationEnds() {
    this.durationSpent = this.utilService.getTimeSpentText(this.initialTime);
    this.calculateScore();
    this.showSolution = false;
    this.showAlert = false;
    this.endPageReached = true;
    this.viewerService.raiseEndEvent(this.car.getCurrentSlideIndex(), this.car.getCurrentSlideIndex(), this.endPageReached, this.finalScore);
  }

  async validateSelectedOption(option) {
    const selectedOptionValue = option ? option.option.value : undefined;
    const currentIndex = this.car.getCurrentSlideIndex() - 1;
    let updated = false;
    if (this.optionSelectedObj !== undefined) {
      let key: any = this.utilService.getKeyValue(Object.keys(this.questions[currentIndex].responseDeclaration));
      this.currentQuestion = this.questions[currentIndex].body;
      this.currentOptions = this.questions[currentIndex].interactions[key].options;
      if (option.cardinality === 'single') {
        const correctOptionValue = this.questions[currentIndex].responseDeclaration[key].correctResponse.value;
        const edataItem = {
          'id': this.questions[currentIndex].identifier,
          'title': this.questions[currentIndex].name,
          'desc': this.questions[currentIndex].description,
          'maxscore': this.questions[currentIndex].maxscore || 0,
        }
        if (Boolean(option.option.value == correctOptionValue)) {
          this.currentScore = this.getScore(currentIndex, key, true);
          this.viewerService.raiseAssesEvent(edataItem, currentIndex, 'Yes', this.currentScore, [option.option], new Date().getTime());
          this.showAlert = true;
          this.alertType = 'correct';
          this.updateScoreBoard(currentIndex, 'correct', undefined, this.currentScore);
        } else if (!Boolean(option.option.value.value == correctOptionValue)) {
          this.currentScore = this.getScore(currentIndex, key, false, option);
          this.viewerService.raiseAssesEvent(edataItem, currentIndex, 'No', this.currentScore, [option.option], new Date().getTime());
          this.showAlert = true;
          this.alertType = 'wrong';
          this.updateScoreBoard(currentIndex, 'wrong', selectedOptionValue, this.currentScore);
        }
      }
      if (option.cardinality === 'multiple') {
        let key: any = this.utilService.getKeyValue(Object.keys(this.questions[currentIndex].responseDeclaration));
        const responseDeclaration = this.questions[currentIndex].responseDeclaration;
        this.currentScore = this.utilService.getMultiselectScore(option.option, responseDeclaration);
        if (this.currentScore > 0) {
          if (this.showFeedBack) {
            this.updateScoreBoard(((currentIndex + 1)), 'correct', undefined, this.currentScore);
            this.correctFeedBackTimeOut();
            this.showAlert = true;
            this.alertType = 'correct';
          } else if (!this.showFeedBack) {
            this.nextSlide();
          }
        } else if (this.currentScore === 0) {
          if (this.showFeedBack) {
            this.showAlert = true;
            this.alertType = 'wrong';
            this.updateScoreBoard((currentIndex + 1), 'wrong');
          } else if (!this.showFeedBack) {
            this.nextSlide();
          }
        }
      }
      this.optionSelectedObj = undefined;
    } else if (this.optionSelectedObj === undefined && this.allowSkip && this.utilService.getQuestionType(this.questions, currentIndex) === 'MCQ') {
      this.nextSlide();
    } else if (this.utilService.getQuestionType(this.questions, currentIndex) === 'SA' || this.startPageInstruction && this.car.getCurrentSlideIndex() === 0) {
      this.nextSlide();
    } else if (this.startPageInstruction && this.optionSelectedObj === undefined && !this.active && !this.allowSkip && this.car.getCurrentSlideIndex() > 0 && this.utilService.getQuestionType(this.questions, currentIndex) === 'MCQ'
      && !this.loadScoreBoard && this.utilService.canGo(this.progressBarClass[this.car.getCurrentSlideIndex()])) {
      this.infopopupTimeOut();
    } else if (this.optionSelectedObj === undefined && !this.active && !this.allowSkip && this.car.getCurrentSlideIndex() >= 0 && this.utilService.getQuestionType(this.questions, currentIndex) === 'MCQ'
      && !this.loadScoreBoard && this.utilService.canGo(this.progressBarClass[this.car.getCurrentSlideIndex()])) {
      this.infopopupTimeOut();
    } else if (!this.optionSelectedObj && this.active) {
      this.nextSlide();
    }
  }


  infopopupTimeOut() {
    this.infoPopup = true;
    setTimeout(() => {
      this.infoPopup = false;
    }, 2000)
  }

  updateScoreBoard(index, classToBeUpdated, optionValue?, score?) {
    if (this.showFeedBack) {
      this.progressBarClass.forEach((ele) => {
        if (ele.index - 1 === index) {
          ele.class = classToBeUpdated;
          ele.score = score ? score : 0;
        }
      })
    } else if (!this.showFeedBack) {
      this.progressBarClass.forEach((ele) => {
        if (ele.index - 1 === index) {
          ele.class = classToBeUpdated;
          ele.score = score ? score : 0;
          ele.value = optionValue;
        }
      })
    }
  }

  calculateScore() {
    this.finalScore = 0;
    this.progressBarClass.forEach((ele) => {
      this.finalScore = this.finalScore + ele.score;
    })
  }

  scoreBoardLoaded(event) {
    if (event.scoreBoardLoaded) {
      this.calculateScore();
    }
  }

  correctFeedBackTimeOut() {
    this.intervalRef = setTimeout(() => {
      this.showAlert = false;
      if (!this.car.isLast(this.car.getCurrentSlideIndex())) {
        this.nextSlide();
      } else if (this.car.isLast(this.car.getCurrentSlideIndex())) {
        this.endPageReached = true;
        this.calculateScore();
      }
    }, 3000)
  }

  nextSlideClicked(event) {
    if (this.car.getCurrentSlideIndex() === 0) {
      return this.nextSlide();
    }
    if (event.type === 'next') {
      this.validateSelectedOption(this.optionSelectedObj);
    }
  }

  previousSlideClicked(event) {
    if (event = 'previous clicked') {
      this.prevSlide();
    }
  }

  replayContent() {
    this.replayed = true;
    this.initialTime = new Date().getTime();
    this.questionIds = this.questionIdsCopy;
    this.progressBarClass = [];
    this.setInitialScores();
    this.viewerService.raiseHeartBeatEvent(eventName.replayClicked, TelemetryType.interact, 1);
    this.viewerService.raiseStartEvent(this.car.getCurrentSlideIndex());
    this.viewerService.raiseHeartBeatEvent(eventName.startPageLoaded, 'impression', 0);
    this.endPageReached = false;
    this.loadScoreBoard = false;
    this.disableNext = false;
    this.currentSlideIndex = 1;
    this.car.selectSlide(1);
    this.currentQuestionsMedia = _.get(this.questions[0], 'media');
    this.setImageZoom(_.get(this.questions[0], 'identifier'));
    setTimeout(() => {
      this.replayed = false;
    }, 200)
  }

  inScoreBoardSubmitClicked() {
    this.viewerService.raiseHeartBeatEvent(eventName.scoreBoardSubmitClicked, TelemetryType.interact, pageId.submitPage);
    this.endPageReached = true;
  }

  goToSlide(index) {
    this.disableNext = false;
    this.currentSlideIndex = index;
    if (index === 0) {
      this.optionSelectedObj = undefined;
      this.car.selectSlide(0);
      return;
    }
    this.currentQuestionsMedia = _.get(this.questions[this.currentSlideIndex - 1], 'media');
    this.setImageZoom(_.get(this.questions[this.currentSlideIndex - 1], 'identifier'));
    if (!this.initializeTimer) {
      this.initializeTimer = true;
    }
    if (this.loadScoreBoard) {
      this.loadScoreBoard = false;
    }
    if (this.questions[index - 1] === undefined) {
      this.showQuestions = false;
      this.viewerService.getQuestions(0, index);
      this.currentSlideIndex = index;
    } else if (this.questions[index - 1] !== undefined) {
      this.car.selectSlide(index);
    }
  }

  setInitialScores() {
    if (this.showFeedBack) {
      this.questionIds.forEach((ele, index) => {
        this.progressBarClass.push({
          index: (index + 1), class: 'skipped',
          score: 0,
        });
      })
    } else if (!this.showFeedBack) {
      this.questionIds.forEach((ele, index) => {
        this.progressBarClass.push({
          index: (index + 1), class: 'unattempted', value: undefined,
          score: 0,
        });
      })
    }
  }

  goToQuestion(event) {
    const index = this.startPageInstruction ? event.questionNo : event.questionNo - 1;
    this.car.selectSlide(index + 1);
    this.loadScoreBoard = false;
  }

  getSolutions() {
    this.viewerService.raiseHeartBeatEvent(eventName.showAnswer, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.viewerService.raiseHeartBeatEvent(eventName.showAnswer, TelemetryType.impression, this.car.getCurrentSlideIndex());
    const currentIndex = this.car.getCurrentSlideIndex() - 1;
    this.currentQuestion = this.questions[currentIndex].body;
    this.currentOptions = this.questions[currentIndex].interactions.response1.options;
    this.currentQuestionsMedia = _.get(this.questions[currentIndex], 'media');
    _.forEach(this.currentOptions, (val, key) => {
      this.setImageZoom(String(key));
    });
    if (this.currentSolutions) {
      this.showSolution = true;
    }
    if (this.intervalRef) {
      clearInterval(this.intervalRef)
    }
  }

  getScore(currentIndex, key, isCorrectAnswer, selectedOption?) {
    if (isCorrectAnswer) {
      return this.questions[currentIndex].responseDeclaration[key].correctResponse.outcomes.SCORE ? this.questions[currentIndex].responseDeclaration[key].correctResponse.outcomes.SCORE : this.questions[currentIndex].responseDeclaration[key].maxScore || 1;
    } else {
      const selectedOptionValue = selectedOption.option.value;
      let mapping = this.questions[currentIndex].responseDeclaration.mapping;
      let score = 0;
      if (mapping) {
        mapping.forEach((val) => {
          if (selectedOptionValue === val.response) {
            score = val.outcomes.SCORE || 0;
          }
        });
        return score;
      } else {
        return score;
      }
    }
  }

  viewHint() {
    this.viewerService.raiseHeartBeatEvent(eventName.viewHint, TelemetryType.interact, this.car.getCurrentSlideIndex());
  }

  showAnswerClicked(event) {
    if (event.showAnswer) {
      this.viewerService.raiseHeartBeatEvent(eventName.showAnswer, TelemetryType.interact, pageId.shortAnswer);
      this.viewerService.raiseHeartBeatEvent(eventName.pageScrolled, TelemetryType.impression, this.car.getCurrentSlideIndex());
    }
  }

  setImageZoom(id: string) {
    if (id) {
      let images = document.getElementById(id).getElementsByTagName("img");
      if (!_.isEmpty(images)) {
        _.forEach(images, (image) => {
          image.setAttribute("class", "option-image");
          let imageId = image.getAttribute("data-asset-variable");
          _.forEach(this.currentQuestionsMedia, (val) => {
            if (val.baseUrl && imageId === val.id) {
                image.src = val.baseUrl + val.src;
            }
          });
          let divElement = document.createElement('div');
          divElement.setAttribute("class", "magnify-icon");
          divElement.onclick = (event) => {
            this.viewerService.raiseHeartBeatEvent(eventName.zoomClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
            this.zoomImgSrc = image.src;
            this.showZoomModal = true;
            event.stopPropagation();
          }
          image.parentNode.insertBefore(divElement, image.nextSibling);
        });
      }
    }
  }

  zoomin() {
    this.viewerService.raiseHeartBeatEvent(eventName.zoomInClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    let myImg = document.getElementById("modalImage");
    let currWidth = myImg.clientWidth;
    let currHeight = myImg.clientHeight;
    if (this.modalImageWidth === 0) {
      this.modalImageWidth = currWidth;
    }
    if (currWidth < this.modalImageWidth + 300) {
      myImg.style.width = (currWidth + 50) + "px";
      myImg.style.height = (currHeight + 50) + "px";
    }
  }

  zoomout() {
    this.viewerService.raiseHeartBeatEvent(eventName.zoomOutClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    let myImg = document.getElementById("modalImage");
    let currWidth = myImg.clientWidth;
    let currHeight = myImg.clientHeight;
    if (this.modalImageWidth === 0) {
      this.modalImageWidth = currWidth;
    }
    if (currWidth > this.modalImageWidth) {
      myImg.style.width = (currWidth - 50) + "px";
      myImg.style.height = (currHeight - 50) + "px";
    }
  }

  closeZoom() {
    this.viewerService.raiseHeartBeatEvent(eventName.zoomCloseClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    document.getElementById("modalImage").removeAttribute('style');
    this.showZoomModal = false;
    this.modalImageWidth = 0;
  }

  @HostListener('window:beforeunload')
  ngOnDestroy() {
    this.calculateScore();
    this.viewerService.raiseEndEvent(this.currentSlideIndex, this.attemptedQuestions.length, this.endPageReached, this.finalScore);
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}

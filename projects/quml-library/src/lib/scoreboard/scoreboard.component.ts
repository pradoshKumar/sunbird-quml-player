import { Component, Input, OnInit, Output , EventEmitter } from '@angular/core';

@Component({
  selector: 'quml-scoreboard',
  templateUrl: './scoreboard.component.html',
  styleUrls: ['./scoreboard.component.scss']
})
export class ScoreboardComponent implements OnInit {
  @Input() scores: Array<[]>;
  @Input() totalNoOfQuestions: number;
  @Input() contentName: string;
  @Input() showFeedBack: boolean;
  @Output() submitClicked = new EventEmitter<any>();
  @Output() emitQuestionNo = new EventEmitter<any>();
  constructor() { }

  ngOnInit() {
  }

  goToQuestion(index){
    this.emitQuestionNo.emit({questionNo: index})
  }

}

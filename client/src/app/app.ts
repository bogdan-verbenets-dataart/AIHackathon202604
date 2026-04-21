import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  protected message = 'Loading message from backend...';

  ngOnInit(): void {
    this.http
      .get<{ message: string }>('/api/message')
      .subscribe({
        next: (response) => {
          this.message = response.message;
        },
        error: () => {
          this.message = 'Could not reach backend service.';
        }
      });
  }
}

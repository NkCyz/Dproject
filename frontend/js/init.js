// Initialize basic functions
document.addEventListener('DOMContentLoaded', function() {
    const customCursor = document.getElementById('customCursor');
    const navLinks = document.getElementById('navLinks');
    const menuIcon = document.getElementById('menuIcon');
    const themeToggle = document.getElementById('themeToggle');
    
    // Custom cursor
    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = `${e.pageX}px`;
        customCursor.style.top = `${e.pageY}px`;
    });
    
    // Navigation menu toggle
    menuIcon.addEventListener('click', function() {
        navLinks.classList.toggle('active');
    });
    
    // Dark mode toggle
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
    });
    
    // Chart initialization
    const ctx = document.getElementById('myChart').getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Easy', 'Medium', 'Hard'],
            datasets: [{
                label: 'Number of Questions',
                data: [0, 0, 0],  // Initialize to zero
                backgroundColor: ['#6c5ce7', '#a29bfe', '#d1c8e1'],
            }]
        },
        options: {
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        precision: 0  // Ensure integers
                    }
                }
            }
        }
    });
}); 
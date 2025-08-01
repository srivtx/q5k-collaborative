# Basic Usage Examples

This document provides practical examples of using Q5K for collaborative coding.

## Example 1: JavaScript Collaboration

### Scenario
Two developers working on a JavaScript function together.

### Steps
1. **User A** visits Q5K and creates a new room
2. **User A** shares the room URL with **User B**
3. Both users collaborate on writing a function

### Code Example
```javascript
// Collaborative function development
function calculateFibonacci(n) {
    // User A writes the basic structure
    if (n <= 1) return n;
    
    // User B adds the recursive logic
    return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

// User A adds test cases
console.log('Fibonacci of 10:', calculateFibonacci(10));
console.log('Fibonacci of 15:', calculateFibonacci(15));

// User B suggests optimization
function fibonacciOptimized(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) return n;
    
    memo[n] = fibonacciOptimized(n - 1, memo) + fibonacciOptimized(n - 2, memo);
    return memo[n];
}
```

### Chat Conversation
```
User A: Let's start with the basic recursive approach
User B: Good idea! I'll add the base case
User A: Running this... it works but might be slow for large numbers
User B: I can add memoization to optimize it
User A: Perfect! Much faster now
```

## Example 2: Python Data Analysis

### Scenario
Data science team collaboratively analyzing a dataset.

### Code Example
```python
# Collaborative data analysis session
import json
from collections import Counter

# User A sets up the data structure
data = [
    {"name": "Alice", "age": 25, "city": "New York"},
    {"name": "Bob", "age": 30, "city": "London"},
    {"name": "Charlie", "age": 35, "city": "New York"},
    {"name": "Diana", "age": 28, "city": "Paris"},
    {"name": "Eve", "age": 32, "city": "London"}
]

# User B adds analysis functions
def analyze_ages(people):
    ages = [person['age'] for person in people]
    return {
        'average': sum(ages) / len(ages),
        'min': min(ages),
        'max': max(ages)
    }

def analyze_cities(people):
    cities = [person['city'] for person in people]
    return Counter(cities)

# User A runs the analysis
print("Age Analysis:", analyze_ages(data))
print("City Distribution:", dict(analyze_cities(data)))

# User B adds visualization preparation
def prepare_chart_data(counter_data):
    return {
        'labels': list(counter_data.keys()),
        'values': list(counter_data.values())
    }

chart_data = prepare_chart_data(analyze_cities(data))
print("Chart Data:", chart_data)
```

## Example 3: C++ Algorithm Development

### Scenario
Computer science students working on sorting algorithms.

### Code Example
```cpp
#include <iostream>
#include <vector>
#include <algorithm>

// User A implements bubble sort
void bubbleSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                std::swap(arr[j], arr[j + 1]);
            }
        }
    }
}

// User B adds quick sort
int partition(std::vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            std::swap(arr[i], arr[j]);
        }
    }
    std::swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(std::vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

// User A adds testing framework
void printVector(const std::vector<int>& arr) {
    for (int x : arr) {
        std::cout << x << " ";
    }
    std::cout << std::endl;
}

int main() {
    std::vector<int> data = {64, 34, 25, 12, 22, 11, 90};
    
    // Test bubble sort
    std::vector<int> bubbleData = data;
    bubbleSort(bubbleData);
    std::cout << "Bubble Sort: ";
    printVector(bubbleData);
    
    // Test quick sort
    std::vector<int> quickData = data;
    quickSort(quickData, 0, quickData.size() - 1);
    std::cout << "Quick Sort: ";
    printVector(quickData);
    
    return 0;
}
```

## Example 4: Java Object-Oriented Design

### Scenario
Team designing a simple banking system.

### Code Example
```java
// User A creates the base Account class
abstract class Account {
    protected String accountNumber;
    protected double balance;
    protected String owner;
    
    public Account(String accountNumber, String owner, double initialBalance) {
        this.accountNumber = accountNumber;
        this.owner = owner;
        this.balance = initialBalance;
    }
    
    public abstract void deposit(double amount);
    public abstract boolean withdraw(double amount);
    
    public double getBalance() {
        return balance;
    }
    
    public String getAccountInfo() {
        return "Account: " + accountNumber + ", Owner: " + owner + ", Balance: $" + balance;
    }
}

// User B implements SavingsAccount
class SavingsAccount extends Account {
    private double interestRate;
    
    public SavingsAccount(String accountNumber, String owner, double initialBalance, double interestRate) {
        super(accountNumber, owner, initialBalance);
        this.interestRate = interestRate;
    }
    
    @Override
    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
            System.out.println("Deposited $" + amount + " to savings account");
        }
    }
    
    @Override
    public boolean withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
            System.out.println("Withdrew $" + amount + " from savings account");
            return true;
        }
        return false;
    }
    
    public void addInterest() {
        double interest = balance * interestRate / 100;
        balance += interest;
        System.out.println("Added interest: $" + interest);
    }
}

// User A adds CheckingAccount
class CheckingAccount extends Account {
    private double overdraftLimit;
    
    public CheckingAccount(String accountNumber, String owner, double initialBalance, double overdraftLimit) {
        super(accountNumber, owner, initialBalance);
        this.overdraftLimit = overdraftLimit;
    }
    
    @Override
    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
            System.out.println("Deposited $" + amount + " to checking account");
        }
    }
    
    @Override
    public boolean withdraw(double amount) {
        if (amount > 0 && (balance - amount) >= -overdraftLimit) {
            balance -= amount;
            System.out.println("Withdrew $" + amount + " from checking account");
            return true;
        }
        System.out.println("Insufficient funds or overdraft limit exceeded");
        return false;
    }
}

// User B adds main class for testing
public class BankingSystem {
    public static void main(String[] args) {
        SavingsAccount savings = new SavingsAccount("SAV001", "Alice Johnson", 1000.0, 2.5);
        CheckingAccount checking = new CheckingAccount("CHK001", "Bob Smith", 500.0, 200.0);
        
        System.out.println(savings.getAccountInfo());
        System.out.println(checking.getAccountInfo());
        
        savings.deposit(200.0);
        savings.addInterest();
        
        checking.withdraw(600.0); // Should work with overdraft
        checking.withdraw(200.0); // Should fail
        
        System.out.println("\nFinal balances:");
        System.out.println(savings.getAccountInfo());
        System.out.println(checking.getAccountInfo());
    }
}
```

## Example 5: Code Review Session

### Scenario
Senior developer reviewing junior developer's code with suggestions.

### Original Code (by Junior Developer)
```javascript
// Junior developer's initial implementation
function processUserData(users) {
    var result = [];
    for (var i = 0; i < users.length; i++) {
        if (users[i].age >= 18) {
            result.push({
                name: users[i].name,
                email: users[i].email,
                isAdult: true
            });
        }
    }
    return result;
}

var userData = [
    {name: "Alice", age: 25, email: "alice@example.com"},
    {name: "Bob", age: 17, email: "bob@example.com"},
    {name: "Charlie", age: 30, email: "charlie@example.com"}
];

console.log(processUserData(userData));
```

### Chat Discussion
```
Senior Dev: Good start! The logic is correct. Let me suggest some improvements
Junior Dev: Sure, I'm eager to learn!
Senior Dev: First, let's use modern ES6+ features
Junior Dev: Like arrow functions and const/let?
Senior Dev: Exactly! And we can use filter and map for cleaner functional programming
```

### Refactored Code (Collaborative)
```javascript
// Improved version with senior developer's guidance
const processUserData = (users) => {
    // Senior dev: Use input validation
    if (!Array.isArray(users)) {
        throw new Error('Input must be an array');
    }
    
    return users
        // Senior dev: Filter first, then map
        .filter(user => user.age >= 18)
        .map(user => ({
            // Junior dev: I like this destructuring approach!
            name: user.name,
            email: user.email,
            isAdult: true,
            // Senior dev: Let's add the actual age too
            age: user.age
        }));
};

// Senior dev: Let's add some edge case testing
const userData = [
    {name: "Alice", age: 25, email: "alice@example.com"},
    {name: "Bob", age: 17, email: "bob@example.com"},
    {name: "Charlie", age: 30, email: "charlie@example.com"},
    {name: "Diana", age: 18, email: "diana@example.com"} // Edge case: exactly 18
];

console.log('Processed adults:', processUserData(userData));

// Junior dev: What about error handling?
try {
    processUserData("not an array");
} catch (error) {
    console.log('Error caught:', error.message);
}
```

## Best Practices for Collaborative Coding

### 1. Communication
- Use the chat feature to explain your changes
- Ask questions when unsure about logic
- Provide context for complex code sections

### 2. Code Organization
- Keep functions small and focused
- Use descriptive variable names
- Add comments for complex logic

### 3. Testing
- Write test cases together
- Test edge cases
- Verify functionality after each change

### 4. Version Control Simulation
- Make small, incremental changes
- Discuss major refactoring before implementing
- Use comments to mark your contributions

### 5. Learning Together
- Share knowledge and explain techniques
- Review each other's approaches
- Suggest improvements constructively

These examples demonstrate how Q5K can facilitate effective collaborative coding across different programming languages and scenarios.

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract Adoption {
  address[16] public adopters;

  uint[16] public votes;       
  mapping(address => bool) public hasVoted;
  // New: Store vaccination status and info
  bool[16] public vaccinated;
  mapping(uint => string) public vaccinationInfo;

  // New mappings to track adoption history
  mapping(address => uint[]) public userAdoptionHistory; // Tracks pets adopted by a user
  mapping(uint => address[]) public petAdoptionHistory;  // Tracks users who adopted a specific pet

  uint[16] public donations;  // Stores donation amounts for each pet
//
  struct Product {
    uint id;
    string name;
    uint price; // Price in wei
    bool isAvailable;
  }

  struct Service {
    uint id;
    string name;
    uint price; // Price in wei
    bool isAvailable;
  }

  mapping(uint => Product) public products; // Mapping for products
  mapping(uint => Service) public services; // Mapping for services
  uint public productCount = 0;             // Counter for products
  uint public serviceCount = 0;             // Counter for services


  event ProductPurchased(uint id, address buyer, uint price);
  event ServiceBooked(uint id, address buyer, uint price);

  constructor() public {
    // Prepopulate some products and services
    addProduct("Pet Food", 0.01 ether);
    addProduct("Dog Toy", 0.005 ether);
    addProduct("Cat Bed", 0.02 ether);
    addService("Grooming", 0.03 ether);
    addService("Vaccination", 0.05 ether);
    addService("Pet Sitting", 0.02 ether);
  }
  
  // Adopting a pet
    function adopt(uint petId) public returns (uint) {
      require(petId >= 0 && petId <= 15, "Invalid pet ID");
      
      adopters[petId] = msg.sender; // Track the current adopter

      userAdoptionHistory[msg.sender].push(petId);
      // Add the current adopter to the adoption history of the pet
      petAdoptionHistory[petId].push(msg.sender);

      return petId;
    }

    function vote(uint petId) public returns (uint) {
      require(petId >= 0 && petId <= 15);
      require(!hasVoted[msg.sender], "Address has already voted");

      hasVoted[msg.sender] = true;
      votes[petId] += 1;
      return votes[petId];
    }
    function getVotes() public view returns (uint[16] memory) {
      return votes;
    }


    // Donate to a pet
    function donate(uint petId) public payable {
      require(petId >= 0 && petId <= 15, "Invalid pet ID");
      require(msg.value > 0, "Donation must be greater than zero");

      donations[petId] += msg.value;
    }

    //Add Product
    function addProduct(string memory _name, uint _price) public {
      require(_price > 0, "Price must be greater than zero");
      products[productCount] = Product(productCount, _name, _price, true);
      productCount++;
    }
    
    //Add Service
    function addService(string memory _name, uint _price) public {
      require(_price > 0, "Price must be greater than zero");
      services[serviceCount] = Service(serviceCount, _name, _price, true);
      serviceCount++;
    }

    //Buy Product
    function buyProduct(uint _id) public payable {
      Product storage product = products[_id];
      require(product.isAvailable, "Product is not available");
      require(msg.value >= product.price, "Insufficient payment");
      product.isAvailable = false; // Mark product as unavailable
      emit ProductPurchased(_id, msg.sender, product.price);
    }

    //Book Service
    function bookService(uint _id) public payable {
      require(_id < serviceCount, "Invalid service ID");
      Service storage service = services[_id];
      require(service.isAvailable, "Service is not available");
      require(msg.value >= service.price, "Insufficient payment");
      emit ServiceBooked(_id, msg.sender, service.price);
    }

    // Retrieving the adopters
    function getAdopters() public view returns (address[16] memory) {
      return adopters;
    }

    // Register vaccination with some details
    function registerVaccination(uint petId, string memory info) public {
      require(petId >= 0 && petId <= 15, "Invalid petId");
      require(adopters[petId] == msg.sender, "Only adopter can register vaccination");
      vaccinated[petId] = true;
      vaccinationInfo[petId] = info;
    }

    // Cancel vaccination registration
    function cancelVaccination(uint petId) public {
      require(petId >= 0 && petId <= 15, "Invalid petId");
      require(adopters[petId] == msg.sender, "Only adopter can cancel vaccination");
      vaccinated[petId] = false;
      vaccinationInfo[petId] = "";
    }

    // Fetch vaccination status
    function getVaccinationStatus(uint petId) public view returns (bool, string memory) {
      require(petId >= 0 && petId <= 15, "Invalid petId");
      return (vaccinated[petId], vaccinationInfo[petId]);
    }

      // Retrieving the donations
    function getDonations() public view returns (uint[16] memory) {
      return donations;
    }
    
    // Retrieve donation amount for a specific pet
    function getDonationAmount(uint petId) public view returns (uint) {
      require(petId >= 0 && petId <= 15, "Invalid pet ID");
      return donations[petId];
    }

    // Retrieve all products
    function getProduct(uint productId) public view returns (string memory, uint, bool) {
      require(productId < productCount, "Invalid product ID");
      Product memory product = products[productId];
      return (product.name, product.price, product.isAvailable);
    }

    // Retrieve all services
    function getService(uint serviceId) public view returns (string memory, uint, bool) {
      require(serviceId < serviceCount, "Invalid service ID");
      Service memory service = services[serviceId];
      return (service.name, service.price, service.isAvailable);
    }

    
    // Retrieving adoption history for a specific user
    function getUserAdoptionHistory(address user) public view returns (uint[] memory) {
      return userAdoptionHistory[user];
    }
    

    // Retrieving the adoption history of a specific pet
    function getPetAdoptionHistory(uint petId) public view returns (address[] memory) {
      require(petId >= 0 && petId <= 15, "Pet ID is invalid");
      return petAdoptionHistory[petId];

    }

}





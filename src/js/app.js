App = {
  web3Provider: null,
  contracts: {},
  vaccinationRecords: {}, // Store vaccination info locally by petId

  init: async function() {
    // Load pets.
    $.getJSON('../pets.json', function(data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (i = 0; i < data.length; i ++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-breed').text(data[i].breed);
        petTemplate.find('.pet-age').text(data[i].age);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].id);
        petTemplate.find('.btn-vote').attr('data-id', data[i].id);
        petTemplate.find('.btn-register').attr('data-id', data[i].id);
        petTemplate.find('.btn-history').attr('data-id', data[i].id);
        petTemplate.find('.adoption-history').attr('id', 'history-' + data[i].id);

        //21
        petTemplate.find('.btn-donate').attr('data-id', data[i].id);
        // Remove the style="display: none;" to make sure the template is visible
        petTemplate.removeAttr('style');
        //petTemplate.find('.adoption-history').text('Adoption History: Loading...');

        petsRow.append(petTemplate.html());
      }

      App.populateFilters();

    });

    return await App.initWeb3();
  },

  initWeb3: async function() {

    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Adoption.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);
    
      // Set the provider for our contract
      App.contracts.Adoption.setProvider(App.web3Provider);



      // Add serviceCount debugging code here
      App.contracts.Adoption.deployed().then(function (instance) {
        adoptionInstance = instance;

        // Debugging service count
        adoptionInstance.serviceCount().then(function (count) {
          console.log("Total number of services:", count.toString());
        });
      }); 
      
      
      
      // Use our contract to retrieve and mark the adopted pets
      return App.markAdopted();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
    $(document).on('click', '.btn-history', App.handleViewHistory);
    $(document).on('click', '.btn-user-history', App.handleUserAdoptionHistory);
    $(document).on('click', '.btn-vote', App.handleVote);
    $(document).on('click', '.btn-register', App.openVaccinationModal);
    $(document).on('click', '#completeVaccination', App.handleVaccinationRegistration);
    $(document).on('click', '.btn-cancel-vaccination', App.handleCancelVaccination);
    $(document).on('click', '#filterButton', App.filterPets);
    $(document).on('click', '#resetButton', App.resetFilter);
    //21
    $(document).on('click', '.btn-donate', App.handleDonate); // Bind the donate button

    //17
    $(document).on('click', '.btn-buy-product', App.handleBuyProduct);
    $(document).on('click', '.btn-book-service', App.handleBookService);
  },

  markAdopted: function(adopters, account) {
    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;
    
      return adoptionInstance.getAdopters.call();
    }).then(function(adopters) {
      for (i = 0; i < adopters.length; i++) {
        if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
          //$('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
          $('.panel-pet').eq(i).find('.btn-adopt').text('Success').attr('disabled', true);
        }
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },
  markVotes: function() {
    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;
      return adoptionInstance.getVotes.call();
    }).then(function(votes) {
      for (let i = 0; i < votes.length; i++) {
        $('.panel-pet').eq(i).find('.pet-votes').text(votes[i]);
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  markDonated: function() {
    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;

      // Loop through all pets to get their donation amounts
      for (let i = 0; i < 16; i++) {
        adoptionInstance.getDonationAmount(i).then(function(amount) {
          let ethAmount = web3.utils.fromWei(amount.toString(), "ether");
          $(`#pet-${i} .donation-amount`).text(`${ethAmount} ETH`);
        }).catch(function(err) {
          console.error(`Error fetching donation for pet ${i}:`, err.message);
        });
      }
    }).catch(function(err) {
      console.error("Error updating donations:", err.message);
    });
  },

  handleDonate: function (event) {
    event.preventDefault();

    var petId = parseInt($(event.target).data("id"));
    var donationAmount = prompt("Enter donation amount in ETH:");

    if (!donationAmount || isNaN(donationAmount) || donationAmount <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }

    // Convert Ether to Wei manually
    var valueInWei = App.toWei(donationAmount);

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.error("Error fetching accounts:", error);
        return;
      }

      var account = accounts[0];

      App.contracts.Adoption.deployed()
        .then(function (instance) {
          console.log(`Donating ${donationAmount} ETH (in Wei: ${valueInWei}) to Pet ID: ${petId}`);
          return instance.donate(petId, {
            from: account,
            value: valueInWei,
          });
        })
        .then(function (result) {
          alert(`Successfully donated ${donationAmount} ETH to Pet ID ${petId}!`);
          console.log("Transaction successful:", result.tx);
          // Update donation amounts in the UI
          App.updateDonationAmounts();
        })
        .catch(function (err) {
          console.error("Donation failed:", err.message);
          alert("Donation failed. Please try again.");
        });
    });
  },

  updateDonationAmounts: function () {
    App.contracts.Adoption.deployed().then(function (instance) {
      for (let i = 0; i < 16; i++) {
        instance.getDonationAmount(i).then(function (amount) {
          let ethAmount = amount / 1e18; // Convert Wei to Ether
          console.log(`Donation amount for pet ${i}: ${ethAmount} ETH`);
  
          // Update the UI
          var petSelector = `.panel-pet .pet-donations`; // Correct selector
          var petPanel = $(`.btn-donate[data-id='${i}']`).closest('.panel-pet'); // Find specific pet panel
  
          if (petPanel.length > 0) {
            petPanel.find(".pet-donations").text(`${ethAmount}`);
          } else {
            console.error(`Pet panel not found for pet ID ${i}`);
          }
        }).catch(function (err) {
          console.error(`Error fetching donation for pet ${i}:`, err.message);
        });
      }
    }).catch(function (err) {
      console.error("Error updating donations:", err.message);
    });
  },

  handleAdopt: function(event) {
    event.preventDefault();
    var petId = parseInt($(event.target).data('id'));

    web3.eth.getAccounts(function(error, accounts) {
      if (error) console.log(error);
      var account = accounts[0];

      App.contracts.Adoption.deployed().then(function(instance) {
        return instance.adopt(petId, {from: account});
      }).then(function(result) {
        App.markAdopted();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },
  handleVote: function(event) {
    event.preventDefault();

    var petId = parseInt($(event.target).data('id'));

    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.Adoption.deployed().then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.vote(petId, {from: account});
      }).then(function(result) {
        $('.btn-vote').prop('disabled', true).text('Voted');
        return App.markVotes();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },
  openVaccinationModal: function(event) {
    var petId = parseInt($(event.target).data('id'));
    $('#currentPetId').val(petId);

    var buttonText = $(event.target).text().trim().toLowerCase();

    if (buttonText === 'register') {
      // Fresh registration
      $('#vaccineInfo').val('').prop('readonly', false);
      $('#vaccinationModalLabel').text('Vaccination Registration');
      $('#completeVaccination').show();
    } else if (buttonText === 'show') {
      // Show existing vaccination info from local storage
      var info = App.vaccinationRecords[petId] || "";
      $('#vaccineInfo').val(info).prop('readonly', true);
      $('#vaccinationModalLabel').text('Vaccination Information');
      $('#completeVaccination').hide();
    }

    $('#vaccinationModal').modal('show');
  },
  handleVaccinationRegistration: function() {
    var petId = parseInt($('#currentPetId').val());
    var info = $('#vaccineInfo').val().trim();

    if (!info) {
      alert("Please enter vaccination details before completing.");
      return;
    }

    // Store vaccination info locally
    App.vaccinationRecords[petId] = info;

    // Update UI after closing the modal
    $('#vaccinationModal').modal('hide');
    App.markVaccinatedLocally();
  },
  handleCancelVaccination: function(event) {
    var petId = parseInt($(event.target).data('id'));

    // Cancel locally stored vaccination info
    if (App.vaccinationRecords[petId]) {
      delete App.vaccinationRecords[petId];
    }

    App.markVaccinatedLocally();
  },
  markVaccinatedLocally: function() {
    // Based on the local App.vaccinationRecords, update the buttons
    $('.panel-pet').each(function(index) {
      var $panel = $(this);
      var $registerBtn = $panel.find('.btn-register');

      if (App.vaccinationRecords[index]) {
        // Pet vaccinated: change button to "Show"
        $registerBtn.text('Show').removeClass('btn-info').addClass('btn-success').prop('disabled', false);
        
        // Add cancel vaccination button if not present
        if ($panel.find('.btn-cancel-vaccination').length === 0) {
          $panel.find('.panel-body').append('<button class="btn btn-warning btn-cancel-vaccination" type="button" data-id="'+index+'">Cancel Vaccination</button>');
        }
      } else {
        // Pet not vaccinated: button should say "Register"
        $registerBtn.text('Register').removeClass('btn-success').addClass('btn-info').prop('disabled', false);

        // Remove cancel vaccination button if exists
        $panel.find('.btn-cancel-vaccination').remove();
      }
    });
  },

  populateFilters: function() {
    // Original code for populating filters
    var breeds = new Set();
    var ages = new Set();
    var locations = new Set();

    $('.panel-pet').each(function() {
      var petBreed = $(this).find('.pet-breed').text().trim();
      var petAge = $(this).find('.pet-age').text().trim();
      var petLocation = $(this).find('.pet-location').text().trim();

      if (petBreed) breeds.add(petBreed);
      if (petAge) ages.add(petAge);
      if (petLocation) locations.add(petLocation);
    });
  },


  filterPets: function() {
    var breed = $('#breedFilter').val().trim();
    var age = $('#ageFilter').val().trim();
    var location = $('#locationFilter').val().trim();
    var adoptStatus = $('#adoptFilter').val(); // "adopted", "available", or ""

    $('.panel-pet').each(function() {
      var petBreed = $(this).find('.pet-breed').text().trim().toLowerCase();
      var petAge = $(this).find('.pet-age').text().trim();
      var petLocation = $(this).find('.pet-location').text().trim().toLowerCase();

      var isAdopted = $(this).find('.btn-adopt').is(':disabled');

      var matchesBreed = !breed || petBreed === breed.toLowerCase();
      var matchesAge = !age || petAge === age;
      var matchesLocation = !location || petLocation === location.toLowerCase();
      var matchesAdoptStatus = !adoptStatus ||
        (adoptStatus === 'adopted' && isAdopted) ||
        (adoptStatus === 'available' && !isAdopted);

      if (matchesBreed && matchesAge && matchesLocation && matchesAdoptStatus) {
        $(this).parent().show();
      } else {
        $(this).parent().hide();
      }
    });
  },

  resetFilter: function() {
    $('#breedFilter').val('');
    $('#ageFilter').val('');
    $('#locationFilter').val('');
    $('#adoptFilter').val('');

    $('.panel-pet').parent().show();
  },

  // For pet adoption history
  // handleViewHistory: function(event) {
  //   event.preventDefault();

  //   var petId = parseInt($(event.target).data('id'));
  //   console.log("Fetching adoption history for pet ID:", petId);

  //   var historyElement = $('#history-' + petId); // Target the adoption history element
  //   var adoptionInstance;

  //   App.contracts.Adoption.deployed().then(function(instance) {
  //     adoptionInstance = instance;
  //     return adoptionInstance.getPetAdoptionHistory(petId); // Fetch adoption history
  //   }).then(function(addresses) {
  //     console.log("Adoption history retrieved:", addresses); // Debug fetched addresses

  //     if (addresses.length === 0) {
  //       historyElement.html('No adoption history available');
  //     } else {
  //       var historyHTML = '<strong>Adoption History:</strong><br>';
  //       addresses.forEach(function(address, index) {
  //         //historyHTML += `Adopter ${index + 1}: ${address}<br>`; 
  //         const shortenedAddress = address.slice(0, 6) + "..." + address.slice(-4); // Shorten address
  //         historyHTML += `Adopter ${index + 1}: ${shortenedAddress}<br>`;
  //       });
  //       historyElement.html(historyHTML);
  //     }
  //     historyElement.show(); // Make sure the history element is visible
  //   }).catch(function(err) {
  //     console.error("Error fetching adoption history:", err.message);
  //     historyElement.html('Error fetching adoption history');
  //     historyElement.show();
  //   });
  // },
  
  // For pet adoption history
  handleViewHistory: function(event) {
    event.preventDefault();
  
    var petId = parseInt($(event.target).data('id'));
    console.log("Fetching adoption history for pet ID:", petId);
  
    var historyElement = $('#history-' + petId); // Target the adoption history element
  
    // Check if the history element is already visible
    if (historyElement.is(':visible')) {
      // If visible, hide it
      historyElement.hide();
    } else {
      // If not visible, fetch and display the history
      var adoptionInstance;
  
      App.contracts.Adoption.deployed().then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getPetAdoptionHistory(petId); // Fetch adoption history
      }).then(function(addresses) {
        console.log("Adoption history retrieved:", addresses); // Debug fetched addresses
  
        if (addresses.length === 0) {
          historyElement.html('No adoption history available');
        } else {
          var historyHTML = '<strong>Adoption History:</strong><br>';
          addresses.forEach(function(address, index) {
            // Shorten the address for readability
            const shortenedAddress = address.slice(0, 6) + "..." + address.slice(-4);
            historyHTML += `Adopter ${index + 1}: ${shortenedAddress}<br>`;
          });
          historyElement.html(historyHTML);
        }
        historyElement.show(); // Show the history after fetching
      }).catch(function(err) {
        console.error("Error fetching adoption history:", err.message);
        historyElement.html('Error fetching adoption history');
        historyElement.show();
      });
    }
  },

  toWei: function (amountInEther) {
    return amountInEther * 1e18; // Convert Ether to Wei
  },

  //17
  handleBuyProduct: function (event) {
    event.preventDefault();
    console.log("Buy Product button clicked");

    // Fetch the selected product from the dropdown
    const productDropdown = document.getElementById("productDropdown");
    const productIndex = productDropdown.value;

    if (productIndex === "") {
      alert("Please select a valid product.");
      return;
    }

    const productName = productDropdown.options[productDropdown.selectedIndex].text;
    let adoptionInstance;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
      console.log("Error fetching accounts:", error);
      return;
      }

      const account = accounts[0];
      console.log("Using account:", account);

      App.contracts.Adoption.deployed()
        .then(function (instance) {
          adoptionInstance = instance;

          // Fetch product details
          return adoptionInstance.getProduct(productIndex);
        })
        .then(function (product) {
          const priceInWei = product[1];
          console.log(`Product Price (in Wei): ${priceInWei}`);

          if (!priceInWei || priceInWei == 0) {
            alert("Invalid product price. Please try again.");
            return;
          }

          // Confirm purchase
          const confirmPurchase = confirm(`Are you sure you want to purchase: ${productName} for ${priceInWei / 1e18} ETH?`);
          if (!confirmPurchase) return;

          // Execute the buyProduct transaction
          return adoptionInstance.buyProduct(productIndex, {
            from: account,
            value: priceInWei
          });
        })
        .then(function (result) {
          console.log("Transaction successful:", result.tx);
          alert(`Successfully purchased: ${productName}`);
        })
        .catch(function (err) {
          console.log("Transaction failed:", err.message);
          alert("Transaction failed. Please try again.");
        });
      });
    },






  handleBookService: function (event) {
    event.preventDefault();
    console.log("Book Service button clicked");

    // Fetch the selected service from the dropdown
    const serviceDropdown = document.getElementById("serviceDropdown");
    const serviceIndex = serviceDropdown.value;

    if (serviceIndex === "") {
      alert("Please select a valid service.");
      return;
    }

    const serviceName = serviceDropdown.options[serviceDropdown.selectedIndex].text;
    let adoptionInstance;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log("Error fetching accounts:", error);
        return;
      }

      const account = accounts[0];
      console.log("Using account:", account);

      App.contracts.Adoption.deployed()
        .then(function (instance) {
          adoptionInstance = instance;
          // Fetch service details
          return adoptionInstance.getService(serviceIndex);
        })
        .then(function (service) {
          const priceInWei = service[1];
          console.log(`Service Price (in Wei): ${priceInWei}`);

          if (!priceInWei || priceInWei == 0) {
            alert("Invalid service price. Please try again.");
            return;
          }

          // Confirm booking
          const confirmBooking = confirm(`Are you sure you want to book: ${serviceName} for ${priceInWei / 1e18} ETH?`);
          if (!confirmBooking) return;

          // Execute the bookService transaction
          return adoptionInstance.bookService(serviceIndex, {
            from: account,
            value: priceInWei
          });
        })
        .then(function (result) {
          console.log("Transaction successful:", result.tx);
          alert(`Successfully booked: ${serviceName}`);
        })
        .catch(function (err) {
          console.log("Transaction failed:", err.message);
          alert("Transaction failed. Please try again.");
        });
    });
  },   
  // handleViewHistory: function(event) {
  //   event.preventDefault();
    
  //   var petId = parseInt($(event.target).data('id'));
  //   //console.log("View Adoption History button clicked"); 
    
  //   console.log("Fetching adoption history for pet ID:", petId); // Check if petId is being fetched


  //   var historyElement = $('#history-' + petId);
  //   var adoptionInstance;
    
  //   App.contracts.Adoption.deployed().then(function(instance) {
  //     adoptionInstance = instance;
  //     return adoptionInstance.getPetAdoptionHistory(petId);
  //   }).then(function(addresses) {
  //     console.log("History:", addresses);// Check fetched addresses
  //     if (addresses.length === 0) {
  //       historyElement.html('No adoption history available');
  //     } else {
  //       // Format the addresses for display
  //       var historyHTML = '<strong>Adoption History:</strong><br>';
  //       addresses.forEach(function(address, index) {
  //         historyHTML += `Adopter ${index + 1}: ${address}<br>`;
  //       });
  //       historyElement.html(historyHTML);
  //     }
  //   }).catch(function(err) {
  //     console.log(err.message);
  //     historyElement.html('Error fetching adoption history');
  //   });
  // }

  // handleViewHistory: function(event) {
  //   event.preventDefault();
  
  //   var petId = parseInt($(event.target).data('id')); // Get petId from button
  
  //   var adoptionInstance;
  
  //   App.contracts.Adoption.deployed().then(function(instance) {
  //     adoptionInstance = instance;
  //     return adoptionInstance.getPetAdoptionHistory(petId); // Call the smart contract function
  //   }).then(function(history) {
  //     // Display the adoption history in the placeholder
  //     var historyText = "Adoption History: " + history.join(", ");
  //     $(event.target).siblings('.adoption-history').text(historyText).show();
  //   }).catch(function(err) {
  //     console.log(err.message);
  //   });
  // }  
  
  //For user adoption history
  handleUserAdoptionHistory: function() {
    var adoptionInstance;
  
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0]; // Current user's wallet address
  
      App.contracts.Adoption.deployed().then(function(instance) {
        adoptionInstance = instance;
        
        // Call the smart contract to get user adoption history
        return adoptionInstance.getUserAdoptionHistory.call(account);
      }).then(function(petIds) {
        if (petIds.length === 0) {
          console.log("No pets adopted by this user.");
          alert("No adoption history available for this user.");
        } else {
          // Display pet IDs in a friendly format
          var historyText = "Pets adopted: " + petIds.join(", ");
          alert(historyText); // Show as an alert, can also update a div
        }
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  }
  
  //extract more details of adoptions for a user
  // handleUserAdoptionHistory: function() {
  //   var adoptionInstance;
  
  //   web3.eth.getAccounts(function(error, accounts) {
  //     if (error) {
  //       console.log(error);
  //     }
  
  //     var account = accounts[0]; // Current user's wallet address
  
  //     App.contracts.Adoption.deployed().then(function(instance) {
  //       adoptionInstance = instance;
  //       return adoptionInstance.getUserAdoptedPetDetails.call(account);
  //     }).then(function(result) {
  //       var petIds = result[0];
  //       var names = result[1];
  //       var breeds = result[2];
  //       var ages = result[3];
  //       var locations = result[4];
  
  //       if (petIds.length === 0) {
  //         alert("No adoption history available for this user.");
  //       } else {
  //         // Build the HTML content for user adoption history
  //         var historyHTML = "<strong>Your Adoption History:</strong><br>";
  //         for (let i = 0; i < petIds.length; i++) {
  //           historyHTML += `Pet ID: ${petIds[i]}, Name: ${names[i]}, Breed: ${breeds[i]}, Age: ${ages[i]}, Location: ${locations[i]}<br>`;
  //         }
  
  //         // Display the content
  //         $("#user-history").html(historyHTML).show();
  //       }
  //     }).catch(function(err) {
  //       console.log(err.message);
  //     });
  //   });
  // }
  
  // handleUserAdoptionHistory: function() {
  //   var adoptionInstance;
  //   var userHistoryElement = $("#user-history");
  //   userHistoryElement.html(""); // Clear previous content

  //   web3.eth.getAccounts(function(error, accounts) {
  //     if (error) {
  //       console.log(error);
  //     }

  //     var account = accounts[0];

  //     App.contracts.Adoption.deployed().then(function(instance) {
  //       adoptionInstance = instance;

  //       // Fetch the user's adopted pet IDs
  //       return adoptionInstance.getUserAdoptionHistory(account);
  //     }).then(function(petIds) {
  //         if (petIds.length === 0) {
  //           userHistoryElement.html("No adoption history available.");
  //         } else {
  //           var promises = [];

  //           // Fetch details for each pet ID
  //           petIds.forEach(function(petId) {
  //             promises.push(adoptionInstance.getPetDetails(petId));
  //           });

  //           // Process all promises
  //           return Promise.all(promises);
  //         }
  //       }).then(function(petDetailsArray) {
  //         if (petDetailsArray) {
  //           var historyHTML = "<strong>Your Adoption History:</strong><br>";
  //           petDetailsArray.forEach(function(pet) {
  //             historyHTML += `Pet ID: ${pet[0]}, Name: ${pet[1]}, Breed: ${pet[2]}, Age: ${pet[3]}, Location: ${pet[4]}<br>`;
  //           });
  //           userHistoryElement.html(historyHTML);
  //         }
  //       }).catch(function(err) {
  //         console.log(err.message);
  //         userHistoryElement.html("Error fetching adoption history.");
  //       });
  //   });
  // }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});

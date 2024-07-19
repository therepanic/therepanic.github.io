
      var myaudio = document.getElementById("myaudio");
      if(myaudio.paused == true)
      {
        document.getElementById("myaudio").play();
        this.style.backgroundColor = "Blue"; //Цвет кнопки можно изменить напрямую, без всяких картинок.
        this.style.color = "White"; //Заодно меняем цвет текста для удобичитаемости
        //this здесь является самой кнопкой, так как функция является дочерней кнопке
      }
      else if (myaudio.paused == false)
      {
        document.getElementById("myaudio").pause();
        this.style.backgroundColor = "White";
        this.style.color = "Black";
      }


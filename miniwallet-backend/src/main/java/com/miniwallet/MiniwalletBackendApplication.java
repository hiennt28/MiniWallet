package com.miniwallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MiniwalletBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MiniwalletBackendApplication.class, args);
	}

}
